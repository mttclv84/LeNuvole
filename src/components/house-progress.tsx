import { useId } from "react";
import { cn } from "@/lib/utils";

// Pittogramma casa (tetto triangolare, richiamo al simbolo di brand) che si
// riempie dal basso in proporzione all'avanzamento — calcolato in automatico
// dalle lavorazioni previste (vedi lib/utils.ts::computeWorkProgress), non
// più un valore inserito a mano. Le lavorazioni "Completata" riempiono in
// rosso pieno, quelle "In corso" nello stesso rosso ma più leggero (ancora
// in lavorazione, non concluse); tutto il resto non conta.
const HOUSE_PATH = "M22,92 L22,46 L14,46 L50,12 L86,46 L78,46 L78,92 Z";
const HOUSE_TOP = 12;
const HOUSE_BOTTOM = 92;
const TOTAL_HEIGHT = HOUSE_BOTTOM - HOUSE_TOP;

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
            <path d={HOUSE_PATH} fill="currentColor" className="text-brand-red/40" clipPath={`url(#${inProgressId})`} />
          </>
        )}
        {done > 0 && (
          <>
            <clipPath id={doneId}>
              <rect x="0" y={doneY} width="100" height={doneHeight} />
            </clipPath>
            <path d={HOUSE_PATH} fill="currentColor" className="text-brand-red" clipPath={`url(#${doneId})`} />
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
