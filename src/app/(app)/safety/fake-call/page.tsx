"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { fakeCallSchema, type FakeCallInput } from "@/lib/validations";
import { toast } from "sonner";
import { ArrowLeft, Phone, X } from "lucide-react";
import { format } from "date-fns";

export default function FakeCallPage() {
  const queryClient = useQueryClient();
  const [delayMinutes, setDelayMinutes] = useState(1);

  const { data: calls } = useQuery({
    queryKey: ["fake-calls"],
    queryFn: async () => {
      const res = await fetch("/api/fake-call");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: FakeCallInput) => {
      const res = await fetch("/api/fake-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fake-calls"] });
      toast.success("Fake call scheduled — incoming call will appear automatically");
      reset();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fake-call/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fake-calls"] });
      toast.success("Scheduled call cancelled");
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FakeCallInput>({
    resolver: zodResolver(fakeCallSchema),
    defaultValues: { callerName: "Mom", delaySeconds: 60, ringtone: "default" },
  });

  const onSubmit = (data: FakeCallInput) => {
    scheduleMutation.mutate({
      ...data,
      delaySeconds: delayMinutes * 60,
    });
  };

  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/safety">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Fake Call</h1>
      </div>

      <div className="space-y-5 px-5">
        <Card>
          <CardContent className="space-y-4 p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Caller Name</Label>
                <Input {...register("callerName")} placeholder="Mom" />
                {errors.callerName && <p className="text-xs text-destructive">{errors.callerName.message}</p>}
              </div>
              <div>
                <Label>Caller Number (optional)</Label>
                <Input {...register("callerNumber")} placeholder="+91 98765 43210" />
              </div>
              <div>
                <Label>Delay (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Ringtone</Label>
                <select
                  {...register("ringtone")}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                >
                  <option value="default">Classic Phone</option>
                  <option value="digital">Digital Alarm</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={scheduleMutation.isPending}>
                <Phone className="mr-2 h-4 w-4" />
                Schedule Fake Call
              </Button>
            </form>
          </CardContent>
        </Card>

        {calls?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
            {calls.slice(0, 10).map((call: {
              id: string;
              callerName: string;
              status: string;
              scheduledAt: string;
            }) => (
              <Card key={call.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{call.callerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(call.scheduledAt), "MMM d, h:mm a")} · {call.status}
                    </p>
                  </div>
                  {call.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelMutation.mutate(call.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
