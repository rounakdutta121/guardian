"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useFakeCallStore } from "@/stores";
import { useSettings } from "@/hooks/use-api";
import { useNativeFullscreenLock } from "@/hooks/use-native-fullscreen-lock";
import { isCapacitorNative } from "@/lib/communication/platform";
import { Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import { Haptics } from "@capacitor/haptics";

function useRingtone(isRinging: boolean, ringtone: string, enableSound: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hapticRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRinging) return;

    if (enableSound) {
      const audio = new Audio(
        ringtone === "digital"
          ? "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"
          : "https://actions.google.com/sounds/v1/alarms/phone_alerts_and_rings.ogg"
      );
      audio.loop = true;
      audioRef.current = audio;
      audio.play().catch(() => {});
    }

    const vibrate = () => {
      if (isCapacitorNative()) {
        void Haptics.vibrate().catch(() => {});
      } else if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
      }
    };

    vibrate();
    hapticRef.current = setInterval(vibrate, 2000);

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (hapticRef.current) clearInterval(hapticRef.current);
    };
  }, [isRinging, ringtone, enableSound]);
}

function NativeIncomingCallScreen({
  callerName,
  callerNumber,
  callerPhotoUrl,
  onAnswer,
  onDecline,
}: {
  callerName: string | null;
  callerNumber: string | null;
  callerPhotoUrl: string | null;
  onAnswer: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      data-fake-call-portal
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] w-full flex-col bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f0f] text-white select-none touch-none"
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-8 pt-[max(env(safe-area-inset-top),1.5rem)]">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative mb-10"
        >
          <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-white/5" />
          <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/20">
            {callerPhotoUrl ? (
              <img
                src={callerPhotoUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <span className="text-5xl font-light">
                {callerName?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
        </motion.div>

        <p className="text-base font-medium text-white/60">Incoming call</p>
        <h2 className="mt-3 text-center text-4xl font-semibold tracking-tight">
          {callerName ?? "Unknown"}
        </h2>
        {callerNumber && (
          <p className="mt-2 text-lg text-white/50">{callerNumber}</p>
        )}
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mt-8 text-sm text-white/40"
        >
          Mobile · Ringing…
        </motion.p>
      </div>

      <div className="grid grid-cols-2 gap-8 px-10 pb-[max(env(safe-area-inset-bottom),2.5rem)] pt-6">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
            aria-label="Decline call"
          >
            <PhoneOff className="h-8 w-8 text-white" />
          </button>
          <span className="text-sm font-medium text-white/70">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onAnswer}
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30 active:scale-95 transition-transform"
            aria-label="Answer call"
          >
            <Phone className="h-8 w-8 text-white" />
          </button>
          <span className="text-sm font-medium text-white/70">Answer</span>
        </div>
      </div>
    </div>
  );
}

function WebIncomingCallScreen({
  callerName,
  callerNumber,
  callerPhotoUrl,
  onAnswer,
  onDecline,
}: {
  callerName: string | null;
  callerNumber: string | null;
  callerPhotoUrl: string | null;
  onAnswer: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="mb-8 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/10"
      >
        {callerPhotoUrl ? (
          <img src={callerPhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl font-light text-white">
            {callerName?.charAt(0) ?? "?"}
          </span>
        )}
      </motion.div>
      <p className="text-lg text-white/70">Incoming call</p>
      <h2 className="mt-2 text-3xl font-light text-white">{callerName}</h2>
      {callerNumber && <p className="mt-1 text-white/50">{callerNumber}</p>}
      <div className="mt-16 flex gap-16">
        <button
          type="button"
          onClick={onDecline}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500"
          aria-label="Decline"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
        <button
          type="button"
          onClick={onAnswer}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500"
          aria-label="Answer"
        >
          <Phone className="h-7 w-7 text-white" />
        </button>
      </div>
    </motion.div>
  );
}

export function FakeCallOverlay() {
  const {
    activeCallId,
    callerName,
    callerNumber,
    callerPhotoUrl,
    isRinging,
    clear,
  } = useFakeCallStore();
  const { data: settingsData } = useSettings();
  const [mounted, setMounted] = useState(false);
  const isNative = isCapacitorNative();

  useNativeFullscreenLock(isRinging && isNative);

  const ringtone = settingsData?.settings?.fakeCallRingtone ?? "default";
  const enableSound = settingsData?.settings?.enableSound !== false;
  useRingtone(isRinging, ringtone, enableSound);

  useEffect(() => {
    setMounted(true);
  }, []);

  const answerCall = useCallback(async () => {
    if (activeCallId) {
      await fetch(`/api/fake-call/${activeCallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer" }),
      });
    }
    clear();
    toast.success("Call answered");
  }, [activeCallId, clear]);

  const declineCall = useCallback(async () => {
    if (activeCallId) {
      await fetch(`/api/fake-call/${activeCallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
    }
    clear();
  }, [activeCallId, clear]);

  if (!mounted || !isRinging) return null;

  const screenProps = {
    callerName,
    callerNumber,
    callerPhotoUrl,
    onAnswer: answerCall,
    onDecline: declineCall,
  };

  const overlay = (
    <AnimatePresence>
      {isRinging &&
        (isNative ? (
          <NativeIncomingCallScreen key="native-fake-call" {...screenProps} />
        ) : (
          <WebIncomingCallScreen key="web-fake-call" {...screenProps} />
        ))}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
