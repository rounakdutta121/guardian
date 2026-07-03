"use client";

import {
  useFakeCallStore,
  useEmergencyStore,
  useLocationStore,
  useOfflineStore,
} from "@/stores";
import { getQueryClient } from "@/lib/query-client";

let activeUserId: string | null = null;

export function getActiveUserId() {
  return activeUserId;
}

export function setActiveUserId(userId: string | null) {
  activeUserId = userId;
  if (typeof window === "undefined") return;
  if (userId) {
    sessionStorage.setItem("guardian-user-id", userId);
  } else {
    sessionStorage.removeItem("guardian-user-id");
  }
}

export function getStoredUserId() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("guardian-user-id");
}

export function clearUserClientState() {
  getQueryClient().clear();
  useFakeCallStore.getState().clear();
  useEmergencyStore.getState().reset();
  useLocationStore.getState().clear();
  useOfflineStore.getState().setQueueCount(0);
  setActiveUserId(null);
}
