"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppNav, type NavLink } from "@/components/app-nav";
import { TYPE_HREF } from "@/components/notification-bell";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationType } from "@/lib/types";

const HREF_TO_TYPE = new Map<string, NotificationType>(
  (Object.entries(TYPE_HREF) as [NotificationType, string][]).map(([type, href]) => [href, type]),
);

// Nav cliente con un pallino rosso sulla sezione che ha una notifica non
// letta (stessa fonte della campanella in app-header): sparisce da solo
// appena il cliente entra in quella sezione, marcando lette le notifiche di
// quel tipo, cosi' resta coerente con il contatore della campanella.
export function ClientAppNav({
  links,
  profileId,
  initialNotifications,
}: {
  links: NavLink[];
  profileId: string;
  initialNotifications: Notification[];
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const [unreadTypes, setUnreadTypes] = useState<Set<NotificationType>>(
    () => new Set(initialNotifications.filter((n) => !n.read_at).map((n) => n.type)),
  );

  useEffect(() => {
    const channel = supabase
      .channel(`nav-notifications-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${profileId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          setUnreadTypes((prev) => new Set(prev).add(notification.type));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    const enteredType = HREF_TO_TYPE.get(pathname);
    if (!enteredType) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadTypes((prev) => {
      if (!prev.has(enteredType)) return prev;
      const next = new Set(prev);
      next.delete(enteredType);
      return next;
    });

    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_profile_id", profileId)
      .eq("type", enteredType)
      .is("read_at", null)
      .then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, profileId]);

  const augmentedLinks = links.map((link) => {
    const type = HREF_TO_TYPE.get(link.href);
    return type && unreadTypes.has(type) ? { ...link, hasUpdate: true } : link;
  });

  return <AppNav links={augmentedLinks} />;
}
