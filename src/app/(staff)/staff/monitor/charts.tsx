import { cn } from "@/lib/utils";
import { formatMinutes, totalOf, type AreaMinutes } from "@/lib/time-tracking";
import { TIME_AREAS, TIME_AREA_LABEL, type TimeArea } from "@/lib/types";

// Un colore fisso per area, uguale ovunque nel Monitor (vedi --area-* in globals.css).
export const AREA_BG: Record<TimeArea, string> = {
  design: "bg-area-design",
  quoting: "bg-area-quoting",
  site: "bg-area-site",
};

export function AreaSwatch({ area, className }: { area: TimeArea; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-3 w-3 shrink-0 rounded-sm", AREA_BG[area], className)} />;
}

export function AreaLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {TIME_AREAS.map((a) => (
        <li key={a} className="flex items-center gap-1.5">
          <AreaSwatch area={a} /> {TIME_AREA_LABEL[a]}
        </li>
      ))}
    </ul>
  );
}

// Barra orizzontale divisa nelle tre aree. scaleMax permette di confrontare
// più righe sulla stessa scala (la riga più lunga occupa tutta la larghezza).
// Il dettaglio di ogni tratto compare al passaggio del mouse; i valori sono
// comunque sempre scritti accanto, il colore non è mai l'unica informazione.
export function StackedBar({
  minutes,
  scaleMax,
  className,
}: {
  minutes: AreaMinutes;
  scaleMax: number;
  className?: string;
}) {
  const total = totalOf(minutes);
  const widthPercent = scaleMax > 0 ? (total / scaleMax) * 100 : 0;

  return (
    <div className={cn("h-3 w-full rounded-full bg-muted", className)}>
      {total > 0 && (
        <div className="flex h-full gap-0.5" style={{ width: `${Math.max(widthPercent, 2)}%` }}>
          {TIME_AREAS.filter((a) => minutes[a] > 0).map((a) => (
            <div
              key={a}
              title={`${TIME_AREA_LABEL[a]}: ${formatMinutes(minutes[a])}`}
              className={cn("h-full rounded-[4px] first:rounded-l-full last:rounded-r-full", AREA_BG[a])}
              style={{ flexGrow: minutes[a], flexBasis: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Le ore per area di una riga, in chiaro (es. "Progetto 4h · Preventivazione 1h 30m").
export function AreaBreakdown({ minutes }: { minutes: AreaMinutes }) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      {TIME_AREAS.map((a) => (
        <span key={a} className="flex items-center gap-1 tabular-nums">
          <AreaSwatch area={a} className="h-2 w-2" />
          {TIME_AREA_LABEL[a]} {formatMinutes(minutes[a])}
        </span>
      ))}
    </p>
  );
}
