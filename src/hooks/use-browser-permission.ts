"use client";

import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import {
  communicationPermissions,
  PERMISSION_EXPLANATIONS,
  requestNativeEmergencyPermissions,
} from "@/lib/communication";

type PermissionKey =
  | "location"
  | "notifications"
  | "contacts"
  | "camera"
  | "microphone"
  | "backgroundLocation"
  | "phone"
  | "sms";

export async function requestBrowserPermission(
  key: PermissionKey
): Promise<boolean> {
  try {
    switch (key) {
      case "location":
        if (Capacitor.isNativePlatform()) {
          return communicationPermissions.requestLocation();
        }
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            toast.error("Geolocation not supported");
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => {
              toast.error("Location permission denied");
              resolve(false);
            },
            { enableHighAccuracy: true }
          );
        });
      case "backgroundLocation": {
        if (Capacitor.isNativePlatform()) {
          return communicationPermissions.requestBackgroundLocation();
        }
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            toast.error("Geolocation not supported");
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => {
              toast.error("Location permission denied");
              resolve(false);
            },
            { enableHighAccuracy: true }
          );
        });
      }
      case "notifications": {
        if (!("Notification" in window)) {
          toast.error("Notifications not supported");
          return false;
        }
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          toast.error("Notification permission denied");
          return false;
        }
        return true;
      }
      case "camera": {
        if (!navigator.mediaDevices?.getUserMedia) {
          toast.error("Camera not supported");
          return false;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      }
      case "microphone": {
        if (!navigator.mediaDevices?.getUserMedia) {
          toast.error("Microphone not supported");
          return false;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      }
      case "contacts": {
        if (!("contacts" in navigator) || !("ContactsManager" in window)) {
          toast.info("Contact access is saved for when supported on device");
          return true;
        }
        return true;
      }
      case "phone": {
        if (Capacitor.isNativePlatform()) {
          const native = await requestNativeEmergencyPermissions();
          if (!native.phone) {
            toast.error("Phone permission denied — enable in Android Settings");
          }
          return native.phone;
        }
        const info = PERMISSION_EXPLANATIONS.phone;
        toast.info(info.description);
        return communicationPermissions.getDeviceCapabilities().then(
          (c) => c.canMakeCalls
        );
      }
      case "sms": {
        if (Capacitor.isNativePlatform()) {
          const native = await requestNativeEmergencyPermissions();
          if (!native.sms) {
            toast.error("SMS permission denied — enable in Android Settings");
          }
          return native.sms;
        }
        const info = PERMISSION_EXPLANATIONS.sms;
        toast.info(info.description);
        return communicationPermissions.getDeviceCapabilities().then(
          (c) => c.canSendSms
        );
      }
      default:
        return false;
    }
  } catch {
    toast.error("Permission request failed");
    return false;
  }
}
