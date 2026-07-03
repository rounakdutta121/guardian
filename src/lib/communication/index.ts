export type {
  CommunicationPermission,
  CommunicationErrorCode,
  EmergencyContactTarget,
  EmergencyMessageContext,
  SmsSendResult,
  CallResult,
  CommunicationBatchResult,
  TimelineEvent,
  QueuedCommunicationItem,
  StoredLocationPoint,
  DeviceCapabilityReport,
} from "./types";

export {
  isBrowser,
  isCapacitorNative,
  getPlatform,
  isIOS,
  isAndroid,
  isMobileDevice,
  openNativeUrl,
} from "./platform";

export {
  buildEmergencySmsMessage,
  buildSmsPreviewLine,
} from "./message-builder";

export {
  CommunicationPermissionsService,
  communicationPermissions,
  PERMISSION_EXPLANATIONS,
} from "./permissions.service";

export { NativeSmsService, nativeSmsService } from "./sms.service";
export { NativePhoneService, nativePhoneService } from "./phone.service";
export {
  CommunicationQueueService,
  communicationQueue,
} from "./communication-queue.service";
export {
  EmergencyLocationTracker,
  emergencyLocationTracker,
} from "./location-tracker.service";
export {
  EmergencyCommunicationService,
  emergencyCommunicationService,
} from "./emergency-communication.service";

export {
  canUseAutomaticEmergencyComms,
  requestNativeEmergencyPermissions,
  isGuardianNativeAvailable,
} from "./native-bridge";
