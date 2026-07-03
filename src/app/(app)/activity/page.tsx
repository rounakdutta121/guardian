"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivity } from "@/hooks/use-api";
import { formatDistanceToNow } from "date-fns";
import { Download, Search } from "lucide-react";
import {
  Shield,
  AlertTriangle,
  Clock,
  Navigation,
  Phone,
  UserPlus,
  Settings,
  LogIn,
} from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  sos: Shield,
  test_sos: AlertTriangle,
  checkin: Clock,
  journey_start: Navigation,
  journey_end: Navigation,
  guardian_mode: Navigation,
  fake_call: Phone,
  contact_added: UserPlus,
  profile_update: UserPlus,
  login: LogIn,
  settings_change: Settings,
};

const typeColors: Record<string, string> = {
  sos: "text-red-500 bg-red-500/10",
  test_sos: "text-orange-500 bg-orange-500/10",
  checkin: "text-amber-500 bg-amber-500/10",
  journey_start: "text-blue-500 bg-blue-500/10",
  journey_end: "text-emerald-500 bg-emerald-500/10",
  guardian_mode: "text-primary bg-primary/10",
  fake_call: "text-indigo-500 bg-indigo-500/10",
  contact_added: "text-violet-500 bg-violet-500/10",
  profile_update: "text-violet-500 bg-violet-500/10",
  login: "text-gray-500 bg-gray-500/10",
  settings_change: "text-gray-500 bg-gray-500/10",
};

export default function ActivityPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const { data: activities, isLoading } = useActivity({
    type: typeFilter || undefined,
    search: search || undefined,
  });

  const exportActivity = () => {
    const blob = new Blob([JSON.stringify(activities ?? [], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-activity-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="pb-4">
      <PageHeader title="Activity" subtitle="Your safety timeline" showNotifications={false} />

      <div className="space-y-3 px-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={exportActivity}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {["", "sos", "test_sos", "checkin", "journey_start", "guardian_mode", "fake_call"].map((t) => (
            <Button
              key={t || "all"}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => setTypeFilter(t)}
            >
              {t ? t.replace(/_/g, " ") : "All"}
            </Button>
          ))}
        </div>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : activities?.length > 0 ? (
          activities.map((activity: {
            id: string;
            type: string;
            title: string;
            description?: string;
            createdAt: string;
          }) => {
            const Icon = typeIcons[activity.type] ?? Shield;
            const colorClass = typeColors[activity.type] ?? "text-primary bg-primary/10";

            return (
              <Card key={activity.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{activity.title}</p>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="py-16 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground">
              Your safety actions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
