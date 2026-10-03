"use client";

import { useActionState, useState } from "react";
import { Play, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { TimeArea } from "@/lib/types";
import { addManualEntry, startTimer, type TimeFormState } from "./actions";
import { AreaPicker } from "./area-picker";

export interface PersonOption {
  id: string;
  name: string;
}

// Un cliente registrato con i suoi cantieri attivi (solo quelli si possono scegliere).
export interface ClientOption {
  id: string;
  name: string;
  projects: { id: string; label: string }[];
}

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0-12
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, ... 55

const selectClass = "h-12 w-full rounded-md border border-border bg-card px-3 text-sm disabled:opacity-60";

// Persona -> Cliente -> Cantiere -> Area, poi "Avvia timer" oppure
// "Inserimento manuale" (ore e minuti da menu). Cliente e cantiere si
// scelgono solo tra quelli già registrati.
export function TimeEntryForm({
  people,
  clients,
  defaults,
  today,
}: {
  people: PersonOption[];
  clients: ClientOption[];
  defaults: { personId?: string; clientId?: string; projectId?: string; area?: TimeArea };
  // Data di oggi (YYYY-MM-DD, fuso dello studio), calcolata sul server.
  today: string;
}) {
  const [timerState, timerAction, timerPending] = useActionState<TimeFormState, FormData>(startTimer, undefined);
  const [manualState, manualAction, manualPending] = useActionState<TimeFormState, FormData>(addManualEntry, undefined);

  const [personId, setPersonId] = useState(defaults.personId ?? "");
  const [clientId, setClientId] = useState(defaults.clientId ?? "");
  const [projectId, setProjectId] = useState(defaults.projectId ?? "");
  const [manualOpen, setManualOpen] = useState(false);

  // Dopo un inserimento manuale riuscito il pannello si richiude. Aggiornamento
  // durante il render invece di useEffect, come negli altri form del portale.
  const [prevManual, setPrevManual] = useState(manualState);
  if (manualState !== prevManual) {
    setPrevManual(manualState);
    if (manualState?.success) setManualOpen(false);
  }

  const projects = clients.find((c) => c.id === clientId)?.projects ?? [];

  function chooseClient(id: string) {
    setClientId(id);
    const list = clients.find((c) => c.id === id)?.projects ?? [];
    // Con un solo cantiere lo si sceglie in automatico.
    setProjectId(list.length === 1 ? list[0].id : "");
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Nessun cantiere attivo con un cliente abbinato: registra prima il cliente (Clienti) e poi il suo
          cantiere (Cantieri).
        </CardContent>
      </Card>
    );
  }

  const error = timerState?.error ?? manualState?.error;
  const ready = Boolean(personId && clientId && projectId);

  return (
    <Card>
      <CardContent className="p-5">
        <form className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="te_person">Persona</Label>
            <select
              id="te_person"
              name="person_id"
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Seleziona…
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="te_client">Cliente</Label>
            <select
              id="te_client"
              name="client_id"
              required
              value={clientId}
              onChange={(e) => chooseClient(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Seleziona…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="te_project">Cantiere</Label>
            <select
              id="te_project"
              name="project_id"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!clientId}
              className={selectClass}
            >
              <option value="" disabled>
                {clientId ? "Seleziona…" : "Prima scegli il cliente"}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <AreaPicker defaultArea={defaults.area} />

          <Button
            type="submit"
            formAction={timerAction}
            size="lg"
            className="h-14 text-base"
            disabled={!ready || timerPending}
          >
            <Play className="h-5 w-5" /> {timerPending ? "Avvio…" : "Avvia timer"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12"
            onClick={() => setManualOpen((open) => !open)}
            aria-expanded={manualOpen}
          >
            <PenLine className="h-5 w-5" /> Inserimento manuale
          </Button>

          {manualOpen && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="te_hours">Ore</Label>
                  <select id="te_hours" name="hours" defaultValue="0" className={selectClass}>
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h} {h === 1 ? "ora" : "ore"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="te_mins">Minuti</Label>
                  <select id="te_mins" name="mins" defaultValue="0" className={selectClass}>
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="te_date">Giorno</Label>
                <Input id="te_date" name="work_date" type="date" defaultValue={today} max={today} className="h-12" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="te_note">Nota (facoltativa)</Label>
                <Input id="te_note" name="note" placeholder="es. Sopralluogo cantiere" />
              </div>

              <Button type="submit" formAction={manualAction} disabled={!ready || manualPending}>
                {manualPending ? "Salvataggio…" : "Salva tempo"}
              </Button>
            </div>
          )}

          {manualState?.success && !manualOpen && <p className="text-sm text-status-green">Tempo salvato.</p>}
          {error && <p className="text-sm text-status-red">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
