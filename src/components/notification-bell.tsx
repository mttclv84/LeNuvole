"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, FileText, Image as ImageIcon, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  message: MessageCircle,
  media: ImageIcon,
  document: FileText,
};

export const TYPE_HREF: Record<NotificationType, string> = {
  message: "/chat",
  media: "/foto",
  document: "/documenti",
};

export function NotificationBell({
  profileId,
  initialNotifications,
}: {
  profileId: string;
  initialNotifications: Notification[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${profileId}`,
        },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function markAsRead(notification: Notification) {
    if (!notification.read_at) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
    }
    setOpen(false);
    router.push(TYPE_HREF[notification.type]);
  }

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((n) => n.id),
      );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Notifiche"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Chiudi notifiche"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold">Notifiche</p>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="text-xs text-accent hover:underline">
                  Segna tutte come lette
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nessuna notifica.</p>
              ) : (
                notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markAsRead(n)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted",
                        !n.read_at && "bg-accent/5",
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
                      </div>
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-red" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
