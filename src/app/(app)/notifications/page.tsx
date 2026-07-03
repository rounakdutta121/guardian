"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/use-api";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveNotificationRoute } from "@/lib/notifications/routes";

export default function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading, markReadMutation, deleteMutation } = useNotifications();

  const markAllRead = () => {
    markReadMutation.mutate({ action: "read_all" });
  };

  const handleNotificationClick = (notification: {
    id: string;
    type: string;
    title: string;
    isRead: boolean;
    data?: Record<string, unknown>;
  }) => {
    if (!notification.isRead) {
      markReadMutation.mutate({ action: "read", id: notification.id });
    }
    const route = resolveNotificationRoute(notification);
    router.push(route);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2 px-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : data?.notifications?.length > 0 ? (
          data.notifications.map((notification: {
            id: string;
            title: string;
            body: string;
            type: string;
            isRead: boolean;
            createdAt: string;
            data?: Record<string, unknown>;
          }) => (
            <Card
              key={notification.id}
              className={cn(
                "cursor-pointer transition-colors",
                !notification.isRead && "border-primary/30 bg-primary/5"
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{notification.title}</p>
                    {!notification.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, notification.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
