import { AlertTriangle, Fuel, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_WARNING_THRESHOLD, formatMinutes, type AreaSummary } from "@/lib/time-tracking";

// Indicatore "a benzina" delle ore previste di un cantiere.
//
// Il serbatoio pieno (F) sono le ore previste; man mano che si registra tempo
// la lancetta scende verso E. Nell'ultimo 20% si entra in RISERVA (arancio);
// oltre E si è nelle ORE EXTRA (rosso), con quante ore si è sforato.
// Lo stato è sempre anche scritto (icona + parola), mai affidato al solo colore.

// Angoli in gradi, 0 = destra, 90 = alto (senso matematico).
const EXTRA_START = 215; // fondo della zona "extra", in basso a sinistra
const EMPTY = 180; // E
const FULL = -35; // F, in basso a destra
const TANK_SWEEP = EMPTY - FULL; // 215°
const RESERVE_END = EMPTY - TANK_SWEEP * (1 - TIME_WARNING_THRESHOLD); // fine riserva

const CX = 100;
const CY = 100;
const R = 78;
const STROKE = 12;
// Piccolo stacco tra le zone (spaziatura di superficie), in gradi.
const GAP = 1.6;

function point(angle: number, radius = R) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

// Arco da "from" a "to" (from > to), in senso orario sullo schermo.
function arc(from: number, to: number, radius = R) {
  const a = point(from, radius);
  const b = point(to, radius);
  const large = from - to > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

type GaugeState = "none" | "ok" | "reserve" | "extra";

function stateOf(s: AreaSummary): GaugeState {
  if (s.plannedMinutes <= 0) return s.usedMinutes > 0 ? "extra" : "none";
  if (s.level === "over") return "extra";
  if (s.level === "warning") return "reserve";
  return "ok";
}

const STATE_STROKE: Record<GaugeState, string> = {
  none: "stroke-muted-foreground",
  ok: "stroke-status-green",
  reserve: "stroke-status-orange",
  extra: "stroke-status-red",
};


export function FuelGauge({
  summary,
  label,
  size = "md",
  className,
}: {
  summary: AreaSummary;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const state = stateOf(summary);
  const planned = summary.plannedMinutes;
  const remaining = summary.remainingMinutes;

  // Posizione della lancetta.
  let needle: number;
  if (planned <= 0) {
    needle = summary.usedMinutes > 0 ? EXTRA_START : EMPTY;
  } else if (remaining >= 0) {
    needle = EMPTY - (remaining / planned) * TANK_SWEEP;
  } else {
    // Oltre E: la zona extra si riempie fino a uno sforamento pari al 30% del previsto.
    const overRatio = Math.min(1, -remaining / (planned * 0.3));
    needle = EMPTY + overRatio * (EXTRA_START - EMPTY);
  }

  const tip = point(needle, R - STROKE - 6);
  const big =
    state === "none"
      ? "—"
      : remaining >= 0
        ? formatMinutes(remaining)
        : `+${formatMinutes(-remaining)}`;
  const caption = state === "none" ? "ore non previste" : remaining >= 0 ? "residue" : "ore extra";

  const width = size === "lg" ? "max-w-72" : size === "sm" ? "max-w-40" : "max-w-56";
  const title =
    planned > 0
      ? `${label}: usate ${formatMinutes(summary.usedMinutes)} su ${formatMinutes(planned)} previste`
      : `${label}: ${formatMinutes(summary.usedMinutes)} registrate, nessuna ora prevista`;

  return (
    <figure className={cn("flex w-full flex-col items-center", width, className)}>
      <svg viewBox="0 0 200 150" role="img" aria-label={title} className="w-full overflow-visible">
        <title>{title}</title>

        {/* Zone: extra (rosso), riserva (arancio), resto del serbatoio (neutro) */}
        <path d={arc(EXTRA_START, EMPTY + GAP)} className="fill-none stroke-status-red/25" strokeWidth={STROKE} strokeLinecap="round" />
        <path d={arc(EMPTY - GAP / 2, RESERVE_END + GAP / 2)} className="fill-none stroke-status-orange/30" strokeWidth={STROKE} />
        <path d={arc(RESERVE_END - GAP / 2, FULL)} className="fill-none stroke-muted" strokeWidth={STROKE} strokeLinecap="round" />

        {/* Livello attuale: carburante rimasto (da E alla lancetta) o sforamento (da E in giù) */}
        {state !== "none" && planned > 0 && remaining > 0 && (
          <path d={arc(EMPTY - GAP / 2, Math.min(EMPTY - GAP / 2 - 0.1, needle))} className={cn("fill-none", STATE_STROKE[state])} strokeWidth={STROKE - 4} strokeLinecap="round" />
        )}
        {state === "extra" && (
          <path d={arc(needle, EMPTY + GAP)} className="fill-none stroke-status-red" strokeWidth={STROKE - 4} strokeLinecap="round" />
        )}

        {/* Tacche E / ½ / F */}
        <text x={point(EMPTY, R + 16).x} y={point(EMPTY, R + 16).y + 4} textAnchor="middle" className="fill-muted-foreground text-[11px] font-semibold">
          E
        </text>
        <text x={point(EMPTY - TANK_SWEEP / 2, R + 14).x} y={point(EMPTY - TANK_SWEEP / 2, R + 14).y + 2} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          ½
        </text>
        <text x={point(FULL, R + 14).x + 4} y={point(FULL, R + 14).y + 4} textAnchor="middle" className="fill-muted-foreground text-[11px] font-semibold">
          F
        </text>

        {/* Lancetta */}
        <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} className="stroke-foreground" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={6} className="fill-foreground" />
      </svg>

      {/* Il valore sta sotto il quadrante, dove la lancetta non arriva mai. */}
      <figcaption className="-mt-3 flex flex-col items-center gap-0.5 text-center">
        <span className={cn("font-bold leading-none tabular-nums", size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl")}>
          {big}
        </span>
        <span className="text-xs text-muted-foreground">{caption}</span>
        <span className={cn("mt-1 font-semibold", size === "sm" ? "text-sm" : "text-base")}>{label}</span>
        <StateLabel state={state} />
        <span className="text-xs text-muted-foreground tabular-nums">
          {planned > 0
            ? `usate ${formatMinutes(summary.usedMinutes)} / previste ${formatMinutes(planned)}`
            : `usate ${formatMinutes(summary.usedMinutes)}`}
        </span>
      </figcaption>
    </figure>
  );
}

function StateLabel({ state }: { state: GaugeState }) {
  if (state === "reserve") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-orange">
        <Fuel className="h-3.5 w-3.5" /> Riserva
      </span>
    );
  }
  if (state === "extra") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-red">
        <OctagonAlert className="h-3.5 w-3.5" /> Ore extra
      </span>
    );
  }
  if (state === "none") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" /> Ore previste non inserite
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Nei tempi</span>;
}
