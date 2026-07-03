"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestSOSButton } from "@/components/features/test-sos-button";
import { SOSButton } from "@/components/features/sos-button";
import { ArrowLeft, AlertTriangle, MapPin, MessageSquare, Phone, Clock } from "lucide-react";

export default function TestSOSPage() {
  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/safety">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Test SOS</h1>
      </div>

      <div className="space-y-5 px-5">
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Simulation Only</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Test SOS never sends actual SMS or makes real calls. It simulates the full emergency workflow.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What happens during test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Clock, text: "3-second countdown before activation" },
              { icon: MapPin, text: "GPS location captured and stored" },
              { icon: MessageSquare, text: "SMS preview generated (not sent)" },
              { icon: Phone, text: "Call preview prepared (not dialed)" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm">{step.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <TestSOSButton />
        <div className="sr-only" aria-hidden>
          <SOSButton />
        </div>
      </div>
    </div>
  );
}
