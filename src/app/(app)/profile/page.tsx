"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-api";
import { signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  ChevronRight,
  Heart,
  FileText,
  Download,
  Trash2,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data, isLoading, updateMutation } = useProfile();
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleExport = async () => {
    try {
      const [profile, contacts, activities, settings, journeys] = await Promise.all([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/emergency-contacts").then((r) => r.json()),
        fetch("/api/activity").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/journey").then((r) => r.json()),
      ]);
      const exportData = {
        profile,
        contacts,
        activities,
        settings,
        journeys,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guardian-export-${Date.now()}.json`;
      a.click();
      toast.success("Data exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to permanently delete your account? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await signOut();
      router.push("/login");
      toast.success("Account deleted");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const menuItems = [
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/settings/emergency", icon: Heart, label: "Emergency Information" },
    { href: "/settings/privacy", icon: FileText, label: "Privacy" },
  ];

  return (
    <div className="pb-4">
      <PageHeader title="Profile" showNotifications={false} />

      <div className="space-y-5 px-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-2xl font-bold text-white">
              {data?.user?.name?.charAt(0) ?? "?"}
            </div>
            <div className="flex-1 space-y-2">
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <>
                  <Input
                    defaultValue={data?.profile?.displayName ?? data?.user?.name ?? ""}
                    placeholder="Display name"
                    onBlur={(e) => {
                      if (e.target.value) updateMutation.mutate({ displayName: e.target.value });
                    }}
                  />
                  <p className="text-sm text-muted-foreground">{data?.user?.email}</p>
                  {data?.profile?.city && (
                    <p className="text-xs text-muted-foreground">{data.profile.city}</p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Preferences</h3>
            <div>
              <Label>Language</Label>
              <select
                defaultValue={data?.profile?.language ?? "en"}
                onChange={(e) =>
                  updateMutation.mutate({
                    language: e.target.value as "en" | "hi" | "es" | "fr",
                  })
                }
                className="mt-1 flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Medical Information</h3>
            <div className="grid gap-3">
              <div>
                <Label>Blood Type</Label>
                <select
                  defaultValue={data?.profile?.bloodType ?? "unknown"}
                  onChange={(e) =>
                    updateMutation.mutate({
                      bloodType: e.target.value as
                        | "A+"
                        | "A-"
                        | "B+"
                        | "B-"
                        | "AB+"
                        | "AB-"
                        | "O+"
                        | "O-"
                        | "unknown",
                    })
                  }
                  className="mt-1 flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Allergies</Label>
                <Input
                  defaultValue={data?.profile?.allergies ?? ""}
                  placeholder="None"
                  onBlur={(e) => updateMutation.mutate({ allergies: e.target.value })}
                />
              </div>
              <div>
                <Label>Medical Conditions</Label>
                <Input
                  defaultValue={data?.profile?.medicalConditions ?? ""}
                  placeholder="None"
                  onBlur={(e) => updateMutation.mutate({ medicalConditions: e.target.value })}
                />
              </div>
              <div>
                <Label>Medications</Label>
                <Input
                  defaultValue={data?.profile?.medications ?? ""}
                  placeholder="None"
                  onBlur={(e) => updateMutation.mutate({ medications: e.target.value })}
                />
              </div>
              <div>
                <Label>Emergency Notes</Label>
                <Input
                  defaultValue={data?.profile?.emergencyNotes ?? ""}
                  placeholder="Important info for responders"
                  onBlur={(e) => updateMutation.mutate({ emergencyNotes: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 border-b border-border/50 p-4 last:border-0 hover:bg-accent/30"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 border-b border-border/50 p-4 hover:bg-accent/30"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="flex-1 text-left">Theme</span>
              <span className="text-sm text-muted-foreground capitalize">{theme}</span>
            </button>
            <button
              onClick={handleExport}
              className="flex w-full items-center gap-3 border-b border-border/50 p-4 hover:bg-accent/30"
            >
              <Download className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left">Export Data</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 p-4 hover:bg-accent/30"
            >
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={handleDeleteAccount}
          disabled={deleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </div>
  );
}
