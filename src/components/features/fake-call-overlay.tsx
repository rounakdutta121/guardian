"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useFakeCallStore } from "@/stores";
import { useSettings } from "@/hooks/use-api";
import { Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isRinging || settingsData?.settings?.enableSound === false) return;
    const ringtone = settingsData?.settings?.fakeCallRingtone ?? "default";
    const audio = new Audio(
      ringtone === "digital"
        ? "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"
        : "https://actions.google.com/sounds/v1/alarms/phone_alerts_and_rings.ogg"
    );
    audio.loop = true;
    audioRef.current = audio;
    audio.play().catch(() => {});
    if (settingsData?.settings?.enableVibration !== false && navigator.vibrate) {
      navigator.vibrate([500, 200, 500]);
    }
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [isRinging, settingsData]);

  const answerCall = async () => {
    if (activeCallId) {
      await fetch(`/api/fake-call/${activeCallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer" }),
      });
    }
    clear();
    toast.success("Call answered");
  };

  const declineCall = async () => {
    if (activeCallId) {
      await fetch(`/api/fake-call/${activeCallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
    }
    clear();
  };

  return (
    <AnimatePresence>
      {isRinging && (
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
              onClick={declineCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500"
              aria-label="Decline"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
            <button
              onClick={answerCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500"
              aria-label="Answer"
            >
              <Phone className="h-7 w-7 text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
