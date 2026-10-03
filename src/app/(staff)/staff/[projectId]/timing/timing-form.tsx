"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { TIMING_MAX_HOURS } from "@/lib/time-tracking";
import { saveProjectTiming, type TimingFormState } from "./actions";

const HOUR_OPTIONS = Array.from({ length: TIMING_MAX_HOURS + 1 }, (_, i) => i);

const FIELDS = [
  { name: "est_design_h", label: "Progetto" },
  { name: "est_quoting_h", label: "Preventivazione" },
  { name: "est_site_h", label: "Cantiere" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

// Tre menu da 0 a 100 ore e un Totale calcolato in automatico (non modificabile).
// Con editable=false le ore sono definitive: si vedono ma non si cambiano.
export function TimingForm({
  projectId,
  initial,
  editable,
  alreadySaved,
}: {
  projectId: string;
  initial: Record<FieldName, number>;
  editable: boolean;
  alreadySaved: boolean;
}) {
  const [state, formAction, pending] = useActionState<TimingFormState, FormData>(saveProjectTiming, undefined);
  const [values, setValues] = useState(initial);
  const total = values.est_design_h + values.est_quoting_h + values.est_site_h;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="project_id" value={projectId} />

      <div className="grid gap-3 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <select
              id={f.name}
              name={f.name}
              value={values[f.name]}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: Number(e.target.value) }))}
              disabled={!editable}
              className="h-12 w-full rounded-md border border-border bg-card px-3 text-base tabular-nums disabled:opacity-80"
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "ora" : "ore"}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timing_total">Totale</Label>
          <output
            id="timing_total"
            aria-live="polite"
            className="flex h-12 items-center rounded-md border border-border bg-muted px-3 text-base font-semibold tabular-nums"
          >
            {total} {total === 1 ? "ora" : "ore"}
          </output>
        </div>
      </div>

      {editable ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvataggio…" : "Salva"}
          </Button>
          {!alreadySaved && (
            <p className="text-xs text-muted-foreground">
              Dopo il salvataggio le ore diventano definitive: potrà modificarle solo il Super User.
            </p>
          )}
          {state?.success && <p className="text-sm text-status-green">Ore salvate.</p>}
          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" /> Conteggio definitivo: può modificarlo solo il Super User.
        </p>
      )}
    </form>
  );
}
