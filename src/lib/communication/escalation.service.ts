import { buildEmergencySmsMessage } from "./message-builder";
import { nativeSmsService } from "./sms.service";
import { nativePhoneService } from "./phone.service";
import { delay } from "./platform";
import {
  ESCALATION_CALL_WAIT_MS,
  ESCALATION_SMS_DELAY_MS,
} from "./escalation.config";
import {
  filterContactsForMode,
  sortContactsForEscalation,
} from "./contact-priority";
import type {
  CallResult,
  EmergencyContactTarget,
  EmergencyMessageContext,
  SmsSendResult,
  TimelineEvent,
} from "./types";

let escalationAborted = false;

export function abortEscalation() {
  escalationAborted = true;
}

export function resetEscalationAbort() {
  escalationAborted = false;
}

export function isEscalationAborted(): boolean {
  return escalationAborted;
}

export class EmergencyEscalationService {
  prepareContacts(
    contacts: EmergencyContactTarget[],
    mode: "sos" | "checkin"
  ): EmergencyContactTarget[] {
    return sortContactsForEscalation(filterContactsForMode(contacts, mode));
  }

  async runEscalation(options: {
    sessionId: string;
    isTest: boolean;
    context: EmergencyMessageContext;
    contacts: EmergencyContactTarget[];
    mode: "sos" | "checkin";
    onTimeline?: (event: TimelineEvent) => void;
  }): Promise<{ sms: SmsSendResult[]; calls: CallResult[] }> {
    resetEscalationAbort();

    const chain = this.prepareContacts(options.contacts, options.mode);
    const message = buildEmergencySmsMessage(options.context);
    const smsResults: SmsSendResult[] = [];
    const callResults: CallResult[] = [];

    if (chain.length === 0) {
      return { sms: smsResults, calls: callResults };
    }

    if (options.isTest) {
      for (let i = 0; i < chain.length; i++) {
        const contact = chain[i];
        smsResults.push({
          phone: contact.phone,
          contactName: contact.name,
          priority: contact.priority,
          escalationIndex: i,
          success: true,
          method: "skipped",
        });
        callResults.push({
          success: true,
          method: "skipped",
          contactName: contact.name,
          phone: contact.phone,
          priority: contact.priority,
          escalationIndex: i,
        });
      }
      options.onTimeline?.({
        event: "escalation_simulated",
        timestamp: new Date().toISOString(),
        data: { contacts: chain.length, mode: options.mode },
      });
      return { sms: smsResults, calls: callResults };
    }

    // Phase 1: SMS each contact in priority order (retry next on failure)
    for (let i = 0; i < chain.length; i++) {
      if (isEscalationAborted()) break;

      const contact = chain[i];
      const result = await nativeSmsService.send(contact.phone, message);
      const enriched: SmsSendResult = {
        ...result,
        contactName: contact.name,
        priority: contact.priority,
        escalationIndex: i,
      };
      smsResults.push(enriched);

      options.onTimeline?.({
        event: result.success ? "escalation_sms_sent" : "escalation_sms_failed",
        timestamp: new Date().toISOString(),
        data: {
          contact: contact.name,
          phone: contact.phone,
          priority: contact.priority,
          index: i + 1,
          total: chain.length,
          method: result.method,
        },
      });

      if (i < chain.length - 1 && !isEscalationAborted()) {
        await delay(ESCALATION_SMS_DELAY_MS);
      }
    }

    // Phase 2: Call each contact in order; wait between calls if no answer
    for (let i = 0; i < chain.length; i++) {
      if (isEscalationAborted()) break;

      const contact = chain[i];
      const result = await nativePhoneService.call(contact.phone);
      const enriched: CallResult = {
        ...result,
        contactName: contact.name,
        phone: contact.phone,
        priority: contact.priority,
        escalationIndex: i,
      };
      callResults.push(enriched);

      options.onTimeline?.({
        event: result.success
          ? "escalation_call_initiated"
          : "escalation_call_failed",
        timestamp: new Date().toISOString(),
        data: {
          contact: contact.name,
          phone: contact.phone,
          priority: contact.priority,
          index: i + 1,
          total: chain.length,
          method: result.method,
          note:
            i < chain.length - 1
              ? `Waiting ${ESCALATION_CALL_WAIT_MS / 1000}s before next contact`
              : "Final contact in chain",
        },
      });

      if (i < chain.length - 1 && !isEscalationAborted()) {
        await delay(ESCALATION_CALL_WAIT_MS);
      }
    }

    options.onTimeline?.({
      event: "escalation_complete",
      timestamp: new Date().toISOString(),
      data: {
        mode: options.mode,
        smsAttempted: smsResults.length,
        smsSucceeded: smsResults.filter((r) => r.success).length,
        callsAttempted: callResults.length,
        callsSucceeded: callResults.filter((r) => r.success).length,
      },
    });

    return { sms: smsResults, calls: callResults };
  }
}

export const emergencyEscalationService = new EmergencyEscalationService();
