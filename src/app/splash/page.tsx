"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useSession } from "@/lib/auth/client";

export default function SplashPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    const timer = setTimeout(() => {
      if (session) {
        router.replace("/home");
      } else {
        router.replace("/onboarding");
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [session, isPending, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-violet-600 shadow-xl shadow-primary/30"
        >
          <Shield className="h-12 w-12 text-white" strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight">Guardian</h1>
        <p className="mt-2 text-muted-foreground">Your safety companion</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12"
      >
        <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "linear" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
