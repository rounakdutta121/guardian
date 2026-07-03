import { buildEmergencySmsMessage } from "./message-builder";
import { communicationPermissions } from "./permissions.service";
import { nativeSmsService } from "./sms.service";
import { nativePhoneService } from "./phone.service";
import { communicationQueue } from "./communication-queue.service";
import { emergencyEscalationService, abortEscalation } from "./escalation.service";
import { isAirplaneModeLikely } from "./platform";
import type {
  CommunicationBatchResult,
  EmergencyContactTarget,
  EmergencyMessageContext,
  TimelineEvent,
} from "./types";

export { abortEscalation };

async function fetchEmergencyContacts(): Promise<EmergencyContactTarget[]> {
  const res = await fetch("/api/emergency-contacts");
  if (!res.ok) throw new Error("Failed to load emergency contacts");
  return (await res.json()) as EmergencyContactTarget[];
}

async function logTimelineEvent(
  sessionId: string,
  event: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`/api/emergency/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "log_event", event, data }),
    });
  } catch {
    communicationQueue.enqueue({
      type: "timeline_sync",
      sessionId,
      payload: { event, data },
    });
  }
}

export class EmergencyCommunicationService {
  async executeEmergencyCommunications(options: {
    sessionId: string;
    isTest: boolean;
    context: EmergencyMessageContext;
    contacts?: EmergencyContactTarget[];
    /** SOS uses notifyOnSos contacts; check-in uses all emergency contacts. */
    mode?: "sos" | "checkin";
  }): Promise<CommunicationBatchResult> {
    const mode = options.mode ?? "sos";
    const timelineEvents: TimelineEvent[] = [];
    const now = new Date().toISOString();

    const allContacts = options.contacts ?? (await fetchEmergencyContacts());
    const chain = emergencyEscalationService.prepareContacts(allContacts, mode);

    if (options.isTest) {
      const message = buildEmergencySmsMessage(options.context);
      timelineEvents.push({
        event: "escalation_simulated",
        timestamp: now,
        data: {
          mode,
          contacts: chain.map((c) => ({
            name: c.name,
            phone: c.phone,
            priority: c.priority,
          })),
          preview: message.slice(0, 120),
        },
      });

      const { sms, calls } = await emergencyEscalationService.runEscalation({
        sessionId: options.sessionId,
        isTest: true,
        context: options.context,
        contacts: allContacts,
        mode,
        onTimeline: (e) => timelineEvents.push(e),
      });

      return {
        sms,
        calls,
        call: calls[0] ?? { success: false, method: "skipped" },
        timelineEvents,
      };
    }

    const permissions = await communicationPermissions.ensureEmergencyPermissions();
    const caps = await communicationPermissions.getDeviceCapabilities();

    timelineEvents.push({
      event: "permissions_checked",
      timestamp: now,
      data: { ...permissions, capabilities: caps },
    });

    if (isAirplaneModeLikely()) {
      timelineEvents.push({
        event: "airplane_mode_detected",
        timestamp: now,
        data: { note: "SMS/calls may queue until signal returns" },
      });
    }

    if (chain.length === 0) {
      timelineEvents.push({
        event: "no_contacts_for_escalation",
        timestamp: now,
        data: { mode },
      });
      await logTimelineEvent(options.sessionId, "communication_failed", {
        reason: "NO_CONTACTS",
        mode,
      });
      return {
        sms: [],
        calls: [],
        call: {
          success: false,
          method: "skipped",
          error: "NO_CONTACTS",
          errorMessage:
            mode === "checkin"
              ? "No contacts with check-in alerts enabled."
              : "No emergency contacts with SOS notifications enabled.",
        },
        timelineEvents,
      };
    }

    timelineEvents.push({
      event: "escalation_started",
      timestamp: now,
      data: {
        mode,
        chain: chain.map((c, i) => ({
          order: i + 1,
          name: c.name,
          phone: c.phone,
          priority: c.priority,
        })),
      },
    });

    await logTimelineEvent(options.sessionId, "escalation_started", {
      mode,
      contactCount: chain.length,
    });

    const { sms: smsResults, calls: callResults } =
      await emergencyEscalationService.runEscalation({
        sessionId: options.sessionId,
        isTest: false,
        context: options.context,
        contacts: allContacts,
        mode,
        onTimeline: (e) => {
          timelineEvents.push(e);
          void logTimelineEvent(options.sessionId, e.event, e.data);
        },
      });

    for (const result of smsResults) {
      if (!result.success) {
        communicationQueue.enqueue({
          type: "sms",
          sessionId: options.sessionId,
          payload: {
            phone: result.phone,
            context: options.context,
            priority: result.priority,
          },
        });
      }
    }

    for (const result of callResults) {
      if (!result.success && result.phone) {
        communicationQueue.enqueue({
          type: "call",
          sessionId: options.sessionId,
          payload: { phone: result.phone, priority: result.priority },
        });
      }
    }

    const primaryCall =
      callResults.find((c) => c.success) ??
      callResults[0] ?? {
        success: false,
        method: "skipped" as const,
        error: "NO_CONTACTS" as const,
      };

    return {
      sms: smsResults,
      calls: callResults,
      call: primaryCall,
      timelineEvents,
    };
  }

  async retryQueuedCommunications(): Promise<number> {
    const pending = communicationQueue.getPending();
    let retried = 0;

    for (const item of pending) {
      try {
        if (item.type === "sms") {
          const phone = item.payload.phone as string;
          const context = item.payload.context as EmergencyMessageContext;
          const message = buildEmergencySmsMessage(context);
          const result = await nativeSmsService.send(phone, message);
          if (result.success) {
            communicationQueue.remove(item.id);
            retried++;
          } else {
            communicationQueue.markAttempted(item.id, result.errorMessage);
          }
        } else if (item.type === "call") {
          const phone = item.payload.phone as string;
          const result = await nativePhoneService.call(phone);
          if (result.success) {
            communicationQueue.remove(item.id);
            retried++;
          } else {
            communicationQueue.markAttempted(item.id, result.errorMessage);
          }
        } else if (item.type === "timeline_sync") {
          await logTimelineEvent(
            item.sessionId,
            item.payload.event as string,
            item.payload.data as Record<string, unknown>
          );
          communicationQueue.remove(item.id);
          retried++;
        }
      } catch (error) {
        communicationQueue.markAttempted(
          item.id,
          error instanceof Error ? error.message : "Retry failed"
        );
      }
    }

    return retried;
  }
}

export const emergencyCommunicationService = new EmergencyCommunicationService();
