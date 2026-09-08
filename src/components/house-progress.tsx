import { useId } from "react";
import { cn } from "@/lib/utils";

// Pittogramma casa (tetto triangolare, richiamo al simbolo di brand) che si
// riempie dal basso in proporzione all'avanzamento — calcolato in automatico
// dalle lavorazioni previste (vedi lib/utils.ts::computeWorkProgress), non
// più un valore inserito a mano. Il colore del riempimento va dal rosso
// (avanzamento appena iniziato) al verde (lavori conclusi), passando per
// l'arancio a meta' — le lavorazioni "In corso" usano lo stesso colore ma
// più leggero (ancora in lavorazione, non concluse); tutto il resto non
// conta.
const HOUSE_PATH = "M22,92 L22,46 L14,46 L50,12 L86,46 L78,46 L78,92 Z";
const HOUSE_TOP = 12;
const HOUSE_BOTTOM = 92;
const TOTAL_HEIGHT = HOUSE_BOTTOM - HOUSE_TOP;

// Stessi 3 colori del semaforo usato in Management Cantieri: rosso a inizio
// lavori, arancio a meta', verde a lavori conclusi.
const PROGRESS_STOPS: [number, [number, number, number]][] = [
  [0, [250, 87, 87]], // --status-red / --brand-red (#fa5757)
  [50, [229, 162, 59]], // --status-orange (#e5a23b)
  [100, [63, 166, 107]], // --status-green (#3fa66b)
];

function progressColor(percent: number): string {
  const p = Math.max(0, Math.min(100, percent));
  const upperIndex = PROGRESS_STOPS.findIndex(([stop]) => stop >= p);
  const [lowStop, lowRgb] = PROGRESS_STOPS[Math.max(0, upperIndex - 1)];
  const [highStop, highRgb] = PROGRESS_STOPS[upperIndex === -1 ? PROGRESS_STOPS.length - 1 : upperIndex];
  const ratio = highStop === lowStop ? 0 : (p - lowStop) / (highStop - lowStop);
  const [r, g, b] = lowRgb.map((low, i) => Math.round(low + (highRgb[i] - low) * ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

export function HouseProgress({
  donePercent,
  inProgressPercent,
  className,
}: {
  donePercent: number;
  inProgressPercent: number;
  className?: string;
}) {
  const done = Math.max(0, Math.min(100, Math.round(Number(donePercent) || 0)));
  const inProgress = Math.max(0, Math.min(100 - done, Math.round(Number(inProgressPercent) || 0)));
  const total = done + inProgress;

  const doneId = useId();
  const inProgressId = useId();

  const doneHeight = (done / 100) * TOTAL_HEIGHT;
  const doneY = HOUSE_BOTTOM - doneHeight;
  const inProgressHeight = (inProgress / 100) * TOTAL_HEIGHT;
  const inProgressY = doneY - inProgressHeight;
  const color = progressColor(total);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0" aria-hidden="true">
        <path
          d={HOUSE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
          className="text-muted-foreground/40"
        />
        {inProgress > 0 && (
          <>
            <clipPath id={inProgressId}>
              <rect x="0" y={inProgressY} width="100" height={inProgressHeight} />
            </clipPath>
            <path d={HOUSE_PATH} fill={color} fillOpacity={0.4} clipPath={`url(#${inProgressId})`} />
          </>
        )}
        {done > 0 && (
          <>
            <clipPath id={doneId}>
              <rect x="0" y={doneY} width="100" height={doneHeight} />
            </clipPath>
            <path d={HOUSE_PATH} fill={color} clipPath={`url(#${doneId})`} />
          </>
        )}
      </svg>
      <div>
        <p className="text-2xl font-extrabold leading-none">{total}%</p>
        <p className="mt-1 text-sm text-muted-foreground">Avanzamento cantiere</p>
      </div>
    </div>
  );
}
