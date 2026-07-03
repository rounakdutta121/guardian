import { BottomNav } from "@/components/layout/bottom-nav";
import { NativePermissionsBootstrap } from "@/components/features/native-permissions-bootstrap";
import { CheckinExpiryWatcher } from "@/components/features/checkin-expiry-watcher";
import { CheckinExpiryBootstrap } from "@/components/features/checkin-expiry-bootstrap";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <NativePermissionsBootstrap />
      <CheckinExpiryWatcher />
      <CheckinExpiryBootstrap />
      <main className="safe-bottom">{children}</main>
      <BottomNav />
    </div>
  );
}
