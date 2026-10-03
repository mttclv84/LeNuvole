"use client";

import { useActionState, useSyncExternalStore } from "react";
import { Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatClock } from "@/lib/time-tracking";
import { TIME_AREA_LABEL, type TimeArea } from "@/lib/types";
import { stopTimer, type TimeFormState } from "./actions";

export interface RunningTimerView {
  entryId: string;
  personName: string;
  clientName: string;
  projectLabel: string;
  area: TimeArea;
  startedAt: string;
}

// Orologio condiviso: si aggiorna ogni secondo. Lato server restituisce 0
// (nessuna ora "finta" nell'HTML iniziale, niente errori di idratazione).
function subscribeToClock(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
const getNowSeconds = () => Math.floor(Date.now() / 1000);
const getServerNowSeconds = () => 0;

// Un pannello per ogni timer in corso (uno per persona): più persone possono
// lavorare in parallelo sullo stesso accesso.
export function RunningTimers({ running }: { running: RunningTimerView[] }) {
  if (running.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {running.map((r) => (
        <RunningPanel key={r.entryId} running={r} />
      ))}
    </div>
  );
}

function RunningPanel({ running }: { running: RunningTimerView }) {
  const [state, formAction, pending] = useActionState<TimeFormState, FormData>(stopTimer, undefined);
  const nowSeconds = useSyncExternalStore(subscribeToClock, getNowSeconds, getServerNowSeconds);
  const startedSeconds = Math.floor(new Date(running.startedAt).getTime() / 1000);

  return (
    <Card className="border-accent">
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="entry_id" value={running.entryId} />

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Timer attivo · {running.personName}</p>
            <p className="mt-1 font-semibold">
              {running.clientName} — {running.projectLabel}
            </p>
            <p className="text-sm text-muted-foreground">{TIME_AREA_LABEL[running.area]}</p>
          </div>

          <p className="text-center font-mono text-5xl font-semibold tabular-nums" aria-live="off">
            {nowSeconds === 0 ? "--:--:--" : formatClock(nowSeconds - startedSeconds)}
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`timer_note_${running.entryId}`}>Nota (facoltativa)</Label>
            <Input id={`timer_note_${running.entryId}`} name="note" placeholder="es. Modifica planimetria zona giorno" />
          </div>

          <Button type="submit" size="lg" variant="destructive" className="h-14 text-base" disabled={pending}>
            <Square className="h-5 w-5" /> {pending ? "Salvataggio…" : "Stop timer"}
          </Button>

          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
