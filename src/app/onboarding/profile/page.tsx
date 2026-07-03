"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import { Shield, Phone } from "lucide-react";

export default function ProfileCompletionPage() {
  const router = useRouter();
  const { data: session, refetch } = useSession();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    if (session?.user?.name) {
      reset({ displayName: session.user.name });
    }
  }, [session?.user?.name, reset]);

  const onSubmit = async (data: ProfileInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          displayName: data.displayName || session?.user?.name || "Guardian User",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save profile");
      }

      await refetch();

      toast.success("Profile completed!");
      router.refresh();
      router.replace("/home");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Complete your profile</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Help us personalize your safety experience
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="How should we call you?"
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="Your city" {...register("city")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyNotes">Emergency Notes (optional)</Label>
            <Input
              id="emergencyNotes"
              placeholder="Medical info, allergies..."
              {...register("emergencyNotes")}
            />
          </div>

          <div className="rounded-xl bg-secondary p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone Login</p>
                <p className="text-xs text-muted-foreground">
                  Coming soon — architecture prepared
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Continue to Guardian"}
          </Button>
        </form>
      </div>
    </div>
  );
}
