import { BottomNav } from "@/components/layout/bottom-nav";
import { NativePermissionsBootstrap } from "@/components/features/native-permissions-bootstrap";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <NativePermissionsBootstrap />
      <main className="safe-bottom">{children}</main>
      <BottomNav />
    </div>
  );
}
