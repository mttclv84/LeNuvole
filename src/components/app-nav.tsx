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
  // Voce "in rilievo" (sfondo nero fisso, es. Cantieri) invece del solito
  // sfondo rosso quando attiva.
  emphasis?: boolean;
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
const STAFF_ROOT_SIBLING_SLUGS = ["clienti", "utenti", "logs", "management-cantieri", "tempi"];

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r sm:p-2">
      {links.map(({ href, label, icon, emphasis, separatorBefore, hasUpdate }) => {
        const isStaffRootSiblingPath =
          href === "/staff" && STAFF_ROOT_SIBLING_SLUGS.includes(pathname.split("/")[2]);
        const active =
          pathname === href || (href !== "/" && pathname.startsWith(href + "/") && !isStaffRootSiblingPath);
        return (
          <div key={href} className={cn(separatorBefore && "sm:mt-3 sm:border-t sm:border-border sm:pt-3")}>
            <Link
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors sm:shrink",
                emphasis
                  ? cn("bg-brand-black text-white hover:opacity-90", active && "ring-2 ring-inset ring-brand-red")
                  : active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted",
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
