import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="px-5 py-12 text-center">
      <Link href="/settings">
        <Button variant="ghost" className="mb-8">← Back</Button>
      </Link>
      <Shield className="mx-auto h-16 w-16 text-primary" />
      <h1 className="mt-6 text-2xl font-bold">Guardian</h1>
      <p className="mt-2 text-muted-foreground">Version 1.0.0</p>
      <p className="mx-auto mt-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Guardian is a premium women safety application designed to keep you protected
        with instant SOS, journey tracking, safe check-ins, and emergency contacts.
      </p>
    </div>
  );
}
