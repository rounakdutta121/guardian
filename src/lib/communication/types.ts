export type CommunicationPermission =
  | "location"
  | "backgroundLocation"
  | "phone"
  | "sms"
  | "notifications";

export type CommunicationErrorCode =
  | "PERMISSION_DENIED"
  | "GPS_DISABLED"
  | "NO_SIGNAL"
  | "AIRPLANE_MODE"
  | "NO_INTERNET"
  | "NO_SIM"
  | "BATTERY_SAVER"
  | "PLATFORM_LIMITATION"
  | "NO_CONTACTS"
  | "USER_CANCELLED"
  | "UNKNOWN";

export interface EmergencyContactTarget {
  id: string;
  name: string;
  phone: string;
  priority: number;
  isFavorite: boolean;
  notifyOnSos: boolean;
}

export interface EmergencyMessageContext {
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  batteryLevel: number | null;
  timestamp?: Date;
}

export interface SmsSendResult {
  phone: string;
  success: boolean;
  method: "automatic" | "native_composer" | "skipped";
  error?: CommunicationErrorCode;
  errorMessage?: string;
}

export interface CallResult {
  success: boolean;
  method: "automatic" | "native_dialer" | "skipped";
  contactName?: string;
  phone?: string;
  error?: CommunicationErrorCode;
  errorMessage?: string;
}

export interface CommunicationBatchResult {
  sms: SmsSendResult[];
  call: CallResult;
  timelineEvents: TimelineEvent[];
}

export interface TimelineEvent {
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface QueuedCommunicationItem {
  id: string;
  type: "sms" | "call" | "location_sync" | "timeline_sync";
  sessionId: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
}

export interface StoredLocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  recordedAt: string;
}

export interface DeviceCapabilityReport {
  canSendSms: boolean;
  canMakeCalls: boolean;
  canAutoSendSms: boolean;
  canAutoCall: boolean;
  hasLocation: boolean;
  isOnline: boolean;
  airplaneMode: boolean;
  platform: "web" | "ios" | "android" | "unknown";
  limitations: string[];
}
