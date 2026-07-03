import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  setLocation: (lat: number, lng: number, accuracy?: number) => void;
  setAddress: (address: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  address: null,
  isLoading: false,
  error: null,
  setLocation: (latitude, longitude, accuracy) =>
    set({ latitude, longitude, accuracy: accuracy ?? null, error: null }),
  setAddress: (address) => set({ address }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clear: () =>
    set({
      latitude: null,
      longitude: null,
      accuracy: null,
      address: null,
      error: null,
    }),
}));

interface EmergencyState {
  sessionId: string | null;
  status: "idle" | "countdown" | "active" | "resolved";
  countdown: number;
  isTest: boolean;
  setSession: (id: string, isTest?: boolean) => void;
  setStatus: (status: EmergencyState["status"]) => void;
  setCountdown: (countdown: number) => void;
  reset: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  sessionId: null,
  status: "idle",
  countdown: 3,
  isTest: false,
  setSession: (sessionId, isTest = false) =>
    set({ sessionId, isTest, status: "countdown" }),
  setStatus: (status) => set({ status }),
  setCountdown: (countdown) => set({ countdown }),
  reset: () =>
    set({ sessionId: null, status: "idle", countdown: 3, isTest: false }),
}));

interface OfflineState {
  isOnline: boolean;
  queueCount: number;
  setOnline: (online: boolean) => void;
  setQueueCount: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: true,
  queueCount: 0,
  setOnline: (isOnline) => set({ isOnline }),
  setQueueCount: (queueCount) => set({ queueCount }),
}));

interface OnboardingState {
  step: number;
  completed: boolean;
  setStep: (step: number) => void;
  complete: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 0,
      completed: false,
      setStep: (step) => set({ step }),
      complete: () => set({ completed: true }),
      reset: () => set({ step: 0, completed: false }),
    }),
    { name: "guardian-onboarding" }
  )
);

interface FakeCallState {
  activeCallId: string | null;
  callerName: string | null;
  callerNumber: string | null;
  callerPhotoUrl: string | null;
  isRinging: boolean;
  setActiveCall: (
    id: string,
    name: string,
    number?: string,
    photoUrl?: string
  ) => void;
  setRinging: (ringing: boolean) => void;
  clear: () => void;
}

export const useFakeCallStore = create<FakeCallState>((set) => ({
  activeCallId: null,
  callerName: null,
  callerNumber: null,
  callerPhotoUrl: null,
  isRinging: false,
  setActiveCall: (activeCallId, callerName, callerNumber, callerPhotoUrl) =>
    set({
      activeCallId,
      callerName,
      callerNumber: callerNumber ?? null,
      callerPhotoUrl: callerPhotoUrl ?? null,
      isRinging: true,
    }),
  setRinging: (isRinging) => set({ isRinging }),
  clear: () =>
    set({
      activeCallId: null,
      callerName: null,
      callerNumber: null,
      callerPhotoUrl: null,
      isRinging: false,
    }),
}));
