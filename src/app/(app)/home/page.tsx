"use client";

import { PageHeader } from "@/components/layout/page-header";
import { SOSButton } from "@/components/features/sos-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-api";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSession } from "@/lib/auth/client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  Shield,
  Users,
  Navigation,
  Clock,
  Lightbulb,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const safetyTips = [
  "Share your journey when traveling alone at night",
  "Keep emergency contacts updated regularly",
  "Test SOS monthly to ensure everything works",
  "Use fake call feature in uncomfortable situations",
];

const statusConfig = {
  safe: { label: "Safe", color: "bg-emerald-500", text: "text-emerald-600" },
  tracking: { label: "Tracking", color: "bg-blue-500", text: "text-blue-600" },
  checkin: { label: "Check-In Active", color: "bg-amber-500", text: "text-amber-600" },
  emergency: { label: "Emergency", color: "bg-red-500", text: "text-red-600" },
};

export default function HomePage() {
  const { data: session } = useSession();
  const { data, isLoading } = useDashboard();
  const { latitude, longitude, isLoading: locLoading } = useGeolocation();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const status = data?.safetyStatus ?? "safe";
  const statusInfo = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.safe;

  return (
    <div className="pb-4">
      <PageHeader
        title={`${greeting()}, ${session?.user?.name?.split(" ")[0] ?? "there"}`}
        subtitle="Stay safe today"
        unreadCount={data?.unreadCount ?? 0}
      />

      <div className="space-y-5 px-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("h-3 w-3 rounded-full", statusInfo.color)} />
            <div className="flex-1">
              <p className={cn("text-sm font-semibold", statusInfo.text)}>
                {statusInfo.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {locLoading
                  ? "Getting location..."
                  : latitude
                    ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}`
                    : "Location unavailable"}
              </p>
            </div>
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center py-4"
        >
          <SOSButton />
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/safety/checkin", icon: Clock, label: "Check-In", color: "text-amber-600" },
            { href: "/safety/fake-call", icon: Shield, label: "Fake Call", color: "text-blue-600" },
            { href: "/safety/contacts", icon: Users, label: "Contacts", color: "text-violet-600" },
            { href: "/safety/test-sos", icon: AlertTriangle, label: "Test SOS", color: "text-orange-600" },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col items-center gap-2 p-4">
                  <action.icon className={cn("h-6 w-6", action.color)} />
                  <span className="text-sm font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Emergency Contacts</CardTitle>
            <Link href="/safety/contacts">
              <Button variant="ghost" size="sm">
                View all <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : data?.contacts?.length > 0 ? (
              data.contacts.map((contact: { id: string; name: string; phone: string; isFavorite: boolean }) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No emergency contacts yet.{" "}
                <Link href="/safety/contacts" className="text-primary">
                  Add one
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Link href="/safety/guardian">
          <Card className="bg-gradient-to-br from-primary/10 to-violet-500/10 transition-colors hover:from-primary/15">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Guardian Mode</p>
                <p className="text-sm text-muted-foreground">
                  {data?.activeJourney
                    ? `Tracking to ${data.activeJourney.destinationName}`
                    : "Start live journey tracking"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/safety/journey">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Journey Tracking</p>
                <p className="text-sm text-muted-foreground">
                  Share your route with trusted contacts
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : data?.recentActivity?.length > 0 ? (
              data.recentActivity.map((activity: { id: string; title: string; createdAt: string }) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <p className="text-sm">{activity.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Safety Tip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {safetyTips[new Date().getDate() % safetyTips.length]}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
