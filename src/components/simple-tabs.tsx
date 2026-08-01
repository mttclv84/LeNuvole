"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SimpleTab {
  key: string;
  label: string;
  content: ReactNode;
}

// Tab di contenuto (non di navigazione: nessun cambio URL), usato per
// alternare due elenchi nella stessa pagina — es. Cantieri Attivi/
// Disattivati, Clienti Registrati/Gestiti.
export function SimpleTabs({ tabs, defaultKey }: { tabs: SimpleTab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-3 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "rounded-t-md px-3 py-2 text-sm transition-colors",
              active === t.key
                ? "bg-muted font-bold text-foreground"
                : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {current?.content}
    </div>
  );
}
