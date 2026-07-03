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
}
