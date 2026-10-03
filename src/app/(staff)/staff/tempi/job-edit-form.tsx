"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { TimeJob } from "@/lib/types";
import { updateTimeJob, type TimeFormState } from "./actions";
import { EstimateFields, type ProjectOption } from "./job-modals";

// Modifica di dati e ore previste della commessa (le stime cambiano spesso
// man mano che il lavoro si chiarisce).
export function JobEditForm({ job, projects }: { job: TimeJob; projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState<TimeFormState, FormData>(updateTimeJob, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={job.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit_client_name">Nome cliente</Label>
          <Input id="edit_client_name" name="client_name" defaultValue={job.client_name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit_title">Nome progetto / commessa</Label>
          <Input id="edit_title" name="title" defaultValue={job.title} required />
        </div>
      </div>

      <EstimateFields
        defaults={{ design: Number(job.est_design_h), quoting: Number(job.est_quoting_h), site: Number(job.est_site_h) }}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit_notes">Note</Label>
        <Textarea id="edit_notes" name="notes" defaultValue={job.notes ?? ""} className="min-h-16" />
      </div>

      {projects.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit_project_id">Cantiere collegato</Label>
          <select
            id="edit_project_id"
            name="project_id"
            defaultValue={job.project_id ?? ""}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm sm:w-72"
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva modifiche"}
        </Button>
        {state?.success && <p className="text-sm text-status-green">Salvato.</p>}
        {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
      </div>
    </form>
  );
}
