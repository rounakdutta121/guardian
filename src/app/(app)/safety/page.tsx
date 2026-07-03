"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  AlertTriangle,
  Phone,
  Clock,
  Navigation,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    href: "/safety/contacts",
    icon: Users,
    title: "Emergency Contacts",
    description: "Manage trusted contacts for emergencies",
    color: "from-violet-500 to-purple-600",
  },
  {
    href: "/safety/test-sos",
    icon: AlertTriangle,
    title: "Test SOS",
    description: "Simulate emergency without sending alerts",
    color: "from-orange-500 to-red-500",
  },
  {
    href: "/safety/fake-call",
    icon: Phone,
    title: "Fake Call",
    description: "Schedule incoming calls to exit situations",
    color: "from-blue-500 to-indigo-600",
  },
  {
    href: "/safety/checkin",
    icon: Clock,
    title: "Safe Check-In",
    description: "Set safety timers with auto-alerts",
    color: "from-amber-500 to-orange-500",
  },
  {
    href: "/safety/guardian",
    icon: Navigation,
    title: "Guardian Mode",
    description: "Live tracking with destination ETA",
    color: "from-primary to-violet-600",
  },
  {
    href: "/safety/journey",
    icon: MapPin,
    title: "Journey Tracking",
    description: "Track and share your travel route",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function SafetyPage() {
  return (
    <div className="pb-4">
      <PageHeader title="Safety" subtitle="Your protection toolkit" />

      <div className="space-y-3 px-5">
        {features.map((feature, i) => (
          <motion.div
            key={feature.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={feature.href}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color}`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {feature.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
