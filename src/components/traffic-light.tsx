import { cn } from "@/lib/utils";
import type { StatusLight } from "@/lib/types";

const LIGHTS: { key: StatusLight; onClass: string }[] = [
  { key: "red", onClass: "bg-status-red shadow-[0_0_6px_var(--status-red)]" },
  { key: "orange", onClass: "bg-status-orange shadow-[0_0_6px_var(--status-orange)]" },
  { key: "green", onClass: "bg-status-green shadow-[0_0_6px_var(--status-green)]" },
];

// Semaforo vero (custodia verticale + tre luci impilate rosso/arancio/verde,
// solo quella attiva "accesa"), non un semplice pallino colorato.
export function TrafficLight({ active, className }: { active: StatusLight; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-full bg-brand-black px-1.5 py-2", className)}>
      {LIGHTS.map((l) => (
        <span
          key={l.key}
          className={cn("h-2.5 w-2.5 rounded-full transition-colors", active === l.key ? l.onClass : "bg-white/15")}
        />
      ))}
    </div>
  );
}
