import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Monogram } from "@/components/logo";

export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-card/80 px-4 py-3 shadow-elev-1 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <Monogram className="shrink-0" />
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </form>
      </div>
    </header>
  );
}
