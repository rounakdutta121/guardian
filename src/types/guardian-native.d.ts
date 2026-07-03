declare module "guardian-native" {
  export interface SendSmsResult {
    sent: number;
    automatic: boolean;
  }
  export interface PlaceCallResult {
    placed: boolean;
    automatic: boolean;
  }
  export interface EmergencyPermissionsResult {
    sms: boolean;
    phone: boolean;
  }
  export interface OpenSmsComposerResult {
    opened: boolean;
  }
  export interface OpenDialerResult {
    opened: boolean;
  }
  export interface FakeCallWakeScheduleResult {
    scheduled: boolean;
  }
  export interface FakeCallWakeCancelResult {
    cancelled: boolean;
  }
  export interface FakeCallWakePayload {
    callId: string;
    callerName: string;
    callerNumber?: string;
    callerPhotoUrl?: string;
  }
  export interface GuardianNativePlugin {
    sendSmsAutomatic(options: {
      numbers: string[];
      text: string;
    }): Promise<SendSmsResult>;
    placeCallAutomatic(options: { number: string }): Promise<PlaceCallResult>;
    openSmsComposer(options: {
      numbers: string[];
      text: string;
    }): Promise<OpenSmsComposerResult>;
    openDialer(options: { number: string }): Promise<OpenDialerResult>;
    requestEmergencyPermissions(): Promise<EmergencyPermissionsResult>;
    scheduleFakeCallWake(options: {
      notificationId: number;
      callId: string;
      callerName: string;
      callerNumber?: string;
      callerPhotoUrl?: string;
      triggerAt: number;
    }): Promise<FakeCallWakeScheduleResult>;
    cancelFakeCallWake(options: {
      notificationId: number;
    }): Promise<FakeCallWakeCancelResult>;
    consumePendingFakeCallWake(): Promise<FakeCallWakePayload | null>;
    scheduleCheckinEscalation(options: {
      notificationId: number;
      checkinId: string;
      triggerAt: number;
      message: string;
      contacts: Array<{ name: string; phone: string }>;
    }): Promise<{ scheduled: boolean; contactCount?: number }>;
    cancelCheckinEscalation(options: {
      checkinId: string;
      notificationId: number;
    }): Promise<{ cancelled: boolean }>;
    clearCheckinEscalationPlan(options: {
      checkinId: string;
      notificationId: number;
    }): Promise<{ cleared: boolean }>;
    runStoredCheckinEscalation(options: {
      checkinId: string;
    }): Promise<{
      executed: boolean;
      alreadyRan?: boolean;
      startedService?: boolean;
      reason?: string;
    }>;
    consumePendingCheckinExpire(): Promise<{ checkinId: string } | null>;
    wasCheckinEscalationExecuted(options: {
      checkinId: string;
    }): Promise<{ executed: boolean; callsCompleted?: boolean }>;
  }
  export const GuardianNative: GuardianNativePlugin;
  export function isGuardianNativeAvailable(): boolean;
}
