"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function SupportPage() {
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 10) {
      toast.error("Please enter at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, rating }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Thank you for your feedback!");
      setMessage("");
      setRating(5);
    } catch {
      toast.error("Failed to send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 py-6">
      <Link href="/settings">
        <Button variant="ghost" className="mb-6">← Back</Button>
      </Link>
      <h1 className="text-2xl font-bold">Support</h1>
      <p className="mt-2 text-muted-foreground">We&apos;re here to help</p>

      <div className="mt-8 space-y-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Email Support</p>
              <a href="mailto:support@guardian.app" className="text-sm text-primary">
                support@guardian.app
              </a>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <MessageCircle className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Live Chat</p>
              <p className="text-sm text-muted-foreground">Available 24/7</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <HelpCircle className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">FAQ</p>
              <p className="text-sm text-muted-foreground">
                Emergency contacts, SOS, check-ins, and journey sharing are all available from the Safety tab.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">Send Feedback</h2>
            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <Label>Rating</Label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={`h-10 w-10 rounded-full border text-sm font-medium ${
                        rating >= n ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Message</Label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can improve..."
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
