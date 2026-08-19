"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { CLIENT_COLOR_PALETTE, type Project } from "@/lib/types";
import { updateProjectStatus, type UpdateProjectStatusState } from "../actions";

export function ProjectStatusForm({ project, projectId }: { project: Project; projectId: string }) {
  const [state, formAction, pending] = useActionState<UpdateProjectStatusState, FormData>(
    updateProjectStatus,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="flex flex-wrap gap-4">
        {(["green", "orange", "red"] as const).map((light) => (
          <label key={light} className="flex items-center gap-2 text-sm">
            <input type="radio" name="status_light" value={light} defaultChecked={project.status_light === light} />
            {light === "green" ? "Verde · tutto ok" : light === "orange" ? "Arancio · in attesa" : "Rosso · fermo"}
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status_reason">Motivo (visibile al cliente)</Label>
        <Textarea
          id="status_reason"
          name="status_reason"
          defaultValue={project.status_reason ?? ""}
          placeholder="Es. in attesa di conferma serramenti"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Colore nel Gantt</Label>
        <div className="flex flex-wrap gap-2">
          {CLIENT_COLOR_PALETTE.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={project.color === c} className="peer sr-only" />
              <span
                className="block h-7 w-7 rounded-full border-2 border-transparent peer-checked:border-foreground peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-card"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contract_signed_date">Data firma contratto</Label>
          <Input
            id="contract_signed_date"
            name="contract_signed_date"
            type="date"
            defaultValue={project.contract_signed_date ?? ""}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="work_start_date">Data inizio lavori</Label>
          <Input
            id="work_start_date"
            name="work_start_date"
            type="date"
            defaultValue={project.work_start_date ?? ""}
            className="w-44"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva"}
        </Button>
        {state?.success && <span className="text-sm text-status-green">Modifiche salvate.</span>}
        {state?.error && <span className="text-sm text-status-red">{state.error}</span>}
      </div>
    </form>
  );
}
