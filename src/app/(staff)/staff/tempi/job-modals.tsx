"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { TimeArea } from "@/lib/types";
import { addManualEntry, createTimeJob, type TimeFormState } from "./actions";
import { AreaPicker } from "./area-picker";
import { PersonSelect } from "./person-select";
import type { PersonOption, TimerJobOption } from "./timer-card";

export interface ProjectOption {
  id: string;
  label: string;
}

// ---------------------------------------------------------------------------
// + NUOVO CLIENTE (commessa con ore previste)
// ---------------------------------------------------------------------------

export function NewJobButton({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TimeFormState, FormData>(createTimeJob, undefined);

  return (
    <>
      <Button type="button" variant="outline" size="lg" className="h-12 flex-1" onClick={() => setOpen(true)}>
        <Plus className="h-5 w-5" /> Nuovo cliente
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuovo cliente / commessa">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new_client_name">Nome cliente</Label>
            <Input id="new_client_name" name="client_name" placeholder="es. Mario Rossi" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new_title">Nome progetto / commessa</Label>
            <Input id="new_title" name="title" placeholder="es. Ristrutturazione abitazione Vicenza" required />
          </div>

          <EstimateFields />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new_notes">Note (facoltative)</Label>
            <Textarea id="new_notes" name="notes" className="min-h-16" />
          </div>

          {projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new_project_id">Collega a un cantiere (facoltativo)</Label>
              <select
                id="new_project_id"
                name="project_id"
                defaultValue=""
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="">Nessuno</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Creazione…" : "Crea cliente"}
          </Button>
          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
        </form>
      </Modal>
    </>
  );
}

// Le tre stime di ore, non divise per persona.
export function EstimateFields({
  defaults,
}: {
  defaults?: { design: number; quoting: number; site: number };
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est_design_h" className="text-xs">
          Ore Progetto
        </Label>
        <Input
          id="est_design_h"
          name="est_design_h"
          inputMode="decimal"
          placeholder="0"
          defaultValue={defaults ? String(defaults.design) : undefined}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est_quoting_h" className="text-xs">
          Ore Preventivo
        </Label>
        <Input
          id="est_quoting_h"
          name="est_quoting_h"
          inputMode="decimal"
          placeholder="0"
          defaultValue={defaults ? String(defaults.quoting) : undefined}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="est_site_h" className="text-xs">
          Ore Cantiere
        </Label>
        <Input
          id="est_site_h"
          name="est_site_h"
          inputMode="decimal"
          placeholder="0"
          defaultValue={defaults ? String(defaults.site) : undefined}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// + INSERISCI TEMPO (senza timer)
// ---------------------------------------------------------------------------

export function ManualEntryButton({
  jobs,
  people,
  fixedJobId,
  defaultJobId,
  defaultArea,
  defaultPersonId,
  today,
}: {
  jobs: TimerJobOption[];
  people: PersonOption[];
  fixedJobId?: string;
  defaultJobId?: string;
  defaultArea?: TimeArea;
  defaultPersonId?: string;
  // Data di oggi (YYYY-MM-DD, fuso dello studio), calcolata sul server.
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TimeFormState, FormData>(addManualEntry, undefined);

  // Si chiude da solo a salvataggio riuscito. Aggiornamento durante il render
  // invece di useEffect, come negli altri form del portale.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setOpen(false);
  }

  const noJobs = !fixedJobId && jobs.length === 0;

  return (
    <>
      <Button type="button" variant="outline" size="lg" className="h-12 flex-1" onClick={() => setOpen(true)}>
        <Plus className="h-5 w-5" /> Inserisci tempo
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Inserisci tempo">
        <form action={formAction} className="flex flex-col gap-3">
          <PersonSelect id={`manual_person_${fixedJobId ?? "home"}`} people={people} defaultPersonId={defaultPersonId} />

          {fixedJobId ? (
            <input type="hidden" name="job_id" value={fixedJobId} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual_job_id">Cliente / commessa</Label>
              <select
                id="manual_job_id"
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

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual_hours">Ore</Label>
              <Input id="manual_hours" name="hours" type="number" inputMode="numeric" min={0} max={24} placeholder="0" className="h-12" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual_mins">Minuti</Label>
              <Input id="manual_mins" name="mins" type="number" inputMode="numeric" min={0} max={59} placeholder="0" className="h-12" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual_date">Giorno</Label>
            <Input id="manual_date" name="work_date" type="date" defaultValue={today} max={today} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual_note">Nota (facoltativa)</Label>
            <Input id="manual_note" name="note" placeholder="es. Sopralluogo cantiere" />
          </div>

          <Button type="submit" disabled={pending || noJobs}>
            {pending ? "Salvataggio…" : "Salva tempo"}
          </Button>
          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
        </form>
      </Modal>
    </>
  );
}
