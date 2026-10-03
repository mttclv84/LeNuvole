"use client";

import { useActionState, useSyncExternalStore } from "react";
import { Play, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatClock } from "@/lib/time-tracking";
import { TIME_AREA_LABEL, type TimeArea } from "@/lib/types";
import { startTimer, stopTimer, type TimeFormState } from "./actions";
import { AreaPicker } from "./area-picker";
import { PersonSelect } from "./person-select";

export interface TimerJobOption {
  id: string;
  label: string;
}

export interface PersonOption {
  id: string;
  name: string;
}

export interface RunningTimerView {
  entryId: string;
  personName: string;
  jobLabel: string;
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

// Un pannello per ogni timer in corso (uno per persona), poi il modulo per
// avviarne un altro: più persone possono lavorare in parallelo sullo stesso accesso.
export function TimerCard({
  running,
  jobs,
  people,
  fixedJobId,
  defaultJobId,
  defaultArea,
  defaultPersonId,
}: {
  running: RunningTimerView[];
  jobs: TimerJobOption[];
  people: PersonOption[];
  // Nella scheda commessa il cliente è già noto: niente menu a tendina.
  fixedJobId?: string;
  defaultJobId?: string;
  defaultArea?: TimeArea;
  defaultPersonId?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {running.map((r) => (
        <RunningPanel key={r.entryId} running={r} />
      ))}
      <StartPanel
        jobs={jobs}
        people={people}
        fixedJobId={fixedJobId}
        defaultJobId={defaultJobId}
        defaultArea={defaultArea}
        defaultPersonId={defaultPersonId}
      />
    </div>
  );
}

function StartPanel({
  jobs,
  people,
  fixedJobId,
  defaultJobId,
  defaultArea,
  defaultPersonId,
}: {
  jobs: TimerJobOption[];
  people: PersonOption[];
  fixedJobId?: string;
  defaultJobId?: string;
  defaultArea?: TimeArea;
  defaultPersonId?: string;
}) {
  const [state, formAction, pending] = useActionState<TimeFormState, FormData>(startTimer, undefined);
  const noJobs = !fixedJobId && jobs.length === 0;

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-3">
          <PersonSelect id={`timer_person_${fixedJobId ?? "home"}`} people={people} defaultPersonId={defaultPersonId} />

          {fixedJobId ? (
            <input type="hidden" name="job_id" value={fixedJobId} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timer_job_id">Cliente / commessa</Label>
              <select
                id="timer_job_id"
                name="job_id"
                required
                defaultValue={defaultJobId ?? ""}
                disabled={noJobs}
                className="h-12 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="" disabled>
                  {noJobs ? "Nessuna commessa: creane una" : "Seleziona…"}
                </option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <AreaPicker defaultArea={defaultArea} />

          <Button type="submit" size="lg" className="h-14 text-base" disabled={pending || noJobs}>
            <Play className="h-5 w-5" /> {pending ? "Avvio…" : "Avvia timer"}
          </Button>

          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
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
            <p className="mt-1 font-semibold">{running.jobLabel}</p>
            <p className="text-sm text-muted-foreground">{TIME_AREA_LABEL[running.area]}</p>
          </div>

          <p className="text-center font-mono text-5xl font-semibold tabular-nums" aria-live="off">
            {nowSeconds === 0 ? "--:--:--" : formatClock(nowSeconds - startedSeconds)}
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`timer_note_${running.entryId}`}>Nota (facoltativa)</Label>
            <Input
              id={`timer_note_${running.entryId}`}
              name="note"
              placeholder="es. Modifica planimetria zona giorno"
            />
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
