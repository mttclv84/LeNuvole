"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  // Nodo già renderizzato (es. <Building2 className="h-4 w-4" />), non il
  // riferimento al componente: un Server Component non può passare un
  // riferimento a funzione/componente a un Client Component, solo elementi
  // React già "renderizzati" (oggetti semplici serializzabili).
  icon: ReactNode;
  // Sfondo fisso della voce, indipendente dallo stato attivo:
  //  - "dark"   nero (Cantieri)
  //  - "accent" arancio/rosso brand (Management Lavori)
  //  - "soft"   grigio chiaro (Clienti)
  // Senza tone la voce ha il solito sfondo accent solo quando attiva.
  tone?: "dark" | "accent" | "soft";
  // Stacca visivamente questa voce dalle precedenti (per raggruppare le
  // sezioni riservate al Super User, es. Utenti/Logs).
  separatorBefore?: boolean;
  // Pallino rosso sull'icona: c'è un aggiornamento non ancora visto in
  // questa sezione (vedi ClientAppNav, che lo calcola dalle notifiche).
  hasUpdate?: boolean;
}

// "/staff" (Cantieri) è prefisso letterale di rotte sorelle come
// "/staff/clienti" o "/staff/utenti", che però sono voci di nav a sé: senza
// questa eccezione risulterebbero entrambe "attive" insieme a Cantieri.
const STAFF_ROOT_SIBLING_SLUGS = ["clienti", "utenti", "logs", "management-cantieri", "tempi", "monitor", "cashflow"];

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border/70 bg-card px-2 py-1.5 shadow-elev-1 sm:sticky sm:top-0 sm:h-screen sm:flex-col sm:gap-1 sm:overflow-y-auto sm:border-b-0 sm:border-r sm:p-3">
      {links.map(({ href, label, icon, tone, separatorBefore, hasUpdate }) => {
        const isStaffRootSiblingPath =
          href === "/staff" && STAFF_ROOT_SIBLING_SLUGS.includes(pathname.split("/")[2]);
        const active =
          pathname === href || (href !== "/" && pathname.startsWith(href + "/") && !isStaffRootSiblingPath);
        return (
          <div key={href} className={cn(separatorBefore && "sm:mt-3 sm:border-t sm:border-border sm:pt-3")}>
            <Link
              href={href}
              className={cn(
                // Al passaggio del mouse compare solo un contorno grigio scuro,
                // lo sfondo non cambia.
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-[box-shadow,transform] sm:shrink hover:-translate-y-px hover:ring-2 hover:ring-inset hover:ring-neutral-600",
                tone === "dark" && "raised bg-brand-black text-white",
                tone === "accent" && "raised bg-accent text-accent-foreground",
                tone === "soft" && "bg-muted text-foreground shadow-elev-1",
                !tone && (active ? "raised bg-accent text-accent-foreground" : "text-foreground"),
                // Voce colorata attiva: contorno pieno per distinguerla.
                tone && active && "ring-2 ring-inset ring-brand-red",
                tone === "accent" && active && "ring-brand-black",
              )}
            >
              <span className="relative shrink-0">
                {icon}
                {hasUpdate && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-status-red" aria-hidden />
                )}
              </span>
              {label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
