"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Da mettere in qualunque pagina che mostra dati di un cantiere: quando
// qualcun altro modifica quei dati (staff da un altro dispositivo, o il
// cliente stesso), la pagina già aperta si aggiorna da sola invece di
// restare ferma alla versione caricata all'ultima navigazione. router.refresh()
// rifà solo il fetch dei Server Component, senza perdere lo stato dei form
// client-side ne' scrollare in cima alla pagina.
export function LiveRefresh({
  channel,
  subscriptions,
}: {
  channel: string;
  subscriptions: { table: string; filter?: string }[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => router.refresh(), 400);
    };

    let ch = supabase.channel(channel);
    for (const { table, filter } of subscriptions) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        scheduleRefresh,
      );
    }
    ch.subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  return null;
}
