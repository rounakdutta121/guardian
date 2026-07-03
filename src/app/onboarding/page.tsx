"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Users, Bell, ChevronRight } from "lucide-react";
import { useOnboardingStore } from "@/stores";

const slides = [
  {
    icon: Shield,
    title: "Instant SOS Protection",
    description:
      "One tap activates emergency mode. Your contacts are notified with your live location instantly.",
    color: "from-rose-500 to-red-600",
  },
  {
    icon: MapPin,
    title: "Journey Tracking",
    description:
      "Share your route in real-time with trusted contacts. Guardian Mode keeps you safe on every trip.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Users,
    title: "Emergency Contacts",
    description:
      "Add trusted people who will be alerted when you need help. Priority ordering ensures fast response.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: Bell,
    title: "Safe Check-Ins",
    description:
      "Set timers for automatic safety checks. If you don't confirm, your emergency contacts are alerted.",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { complete } = useOnboardingStore();

  const isLast = step === slides.length - 1;
  const current = slides[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      complete();
      router.push("/register");
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex justify-end p-6">
        <button
          onClick={() => {
            complete();
            router.push("/login");
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div
              className={`mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br ${current.color} shadow-xl`}
            >
              <Icon className="h-14 w-14 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold">{current.title}</h2>
            <p className="mt-4 max-w-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-6 p-8">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        <Button onClick={handleNext} size="lg" className="w-full">
          {isLast ? "Get Started" : "Continue"}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
