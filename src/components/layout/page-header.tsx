"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showNotifications?: boolean;
  unreadCount?: number;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  showNotifications = true,
  unreadCount = 0,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between px-5 pt-6 pb-4", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {showNotifications && (
        <Link
          href="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      )}
    </header>
  );
}
