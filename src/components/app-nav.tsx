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
}

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r sm:p-2">
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors sm:shrink",
              active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
