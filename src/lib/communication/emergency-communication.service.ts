import { buildEmergencySmsMessage } from "./message-builder";
import { communicationPermissions } from "./permissions.service";
import { nativeSmsService } from "./sms.service";
import { nativePhoneService } from "./phone.service";
import { communicationQueue } from "./communication-queue.service";
import { isAirplaneModeLikely } from "./platform";
import type {
  CommunicationBatchResult,
  EmergencyContactTarget,
  EmergencyMessageContext,
  TimelineEvent,
} from "./types";

async function fetchSosContacts(): Promise<EmergencyContactTarget[]> {
  const res = await fetch("/api/emergency-contacts");
  if (!res.ok) throw new Error("Failed to load emergency contacts");
  const contacts = (await res.json()) as EmergencyContactTarget[];
  return contacts.filter((c) => c.notifyOnSos);
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
  }): Promise<CommunicationBatchResult> {
    const timelineEvents: TimelineEvent[] = [];
    const now = new Date().toISOString();

    if (options.isTest) {
      const contacts = options.contacts ?? (await fetchSosContacts());
      const message = buildEmergencySmsMessage(options.context);
      const primary = nativePhoneService.selectPrimaryContact(contacts);

      timelineEvents.push({
        event: "sms_simulated",
        timestamp: now,
        data: {
          recipients: contacts.map((c) => c.phone),
          preview: message.slice(0, 120),
        },
      });
      timelineEvents.push({
        event: "call_simulated",
        timestamp: now,
        data: primary
          ? { name: primary.name, phone: primary.phone }
          : { note: "No primary contact" },
      });

      return {
        sms: contacts.map((c) => ({
          phone: c.phone,
          success: true,
          method: "skipped" as const,
        })),
        call: {
          success: true,
          method: "skipped",
          contactName: primary?.name,
          phone: primary?.phone,
        },
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
        data: { note: "SMS may open when signal returns" },
      });
    }

    const contacts = options.contacts ?? (await fetchSosContacts());
    if (contacts.length === 0) {
      timelineEvents.push({
        event: "no_sos_contacts",
        timestamp: now,
      });
      await logTimelineEvent(options.sessionId, "communication_failed", {
        reason: "NO_CONTACTS",
      });
      return {
        sms: [],
        call: {
          success: false,
          method: "skipped",
          error: "NO_CONTACTS",
          errorMessage: "No emergency contacts with SOS notifications enabled.",
        },
        timelineEvents,
      };
    }

    const phones = contacts.map((c) => c.phone);
    let smsResults = await nativeSmsService.sendEmergencySms(
      phones,
      options.context
    );

    for (const result of smsResults) {
      if (!result.success) {
        communicationQueue.enqueue({
          type: "sms",
          sessionId: options.sessionId,
          payload: {
            phone: result.phone,
            context: options.context,
          },
        });
      }
    }

    const smsSent = smsResults.filter((r) => r.success).length;
    const smsAutomatic = smsResults.some((r) => r.method === "automatic");
    timelineEvents.push({
      event: "sms_initiated",
      timestamp: new Date().toISOString(),
      data: {
        total: smsResults.length,
        sent: smsSent,
        failed: smsResults.length - smsSent,
        method: smsAutomatic ? "automatic_sim_sms" : "native_device_sms",
      },
    });

    await logTimelineEvent(options.sessionId, "sms_initiated", {
      total: smsResults.length,
      sent: smsSent,
      recipients: phones,
    });

    const callResult = await nativePhoneService.callPrimaryContact(contacts);

    if (!callResult.success) {
      communicationQueue.enqueue({
        type: "call",
        sessionId: options.sessionId,
        payload: {
          phone: callResult.phone,
        },
      });
    }

    timelineEvents.push({
      event: callResult.success ? "call_initiated" : "call_failed",
      timestamp: new Date().toISOString(),
      data: {
        contact: callResult.contactName,
        phone: callResult.phone,
        method: callResult.method === "automatic" ? "automatic_sim_call" : "native_dialer",
        error: callResult.error,
      },
    });

    await logTimelineEvent(
      options.sessionId,
      callResult.success ? "call_initiated" : "call_failed",
      {
        contact: callResult.contactName,
        phone: callResult.phone,
      }
    );

    return { sms: smsResults, call: callResult, timelineEvents };
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
