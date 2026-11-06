"use client";

import { useActionState, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatDateTime } from "@/lib/utils";
import { CLIENT_COLOR_PALETTE, type Project, type ProjectKeyDataUnlock } from "@/lib/types";
import { saveProjectKeyData, unlockProjectKeyData, type KeyDataState } from "../actions";

// Dati contrattuali: colore Gantt, data firma contratto, data inizio lavori.
// Salvati tutti e tre restano bloccati; per cambiarli serve uno sblocco con
// giustificativo, poi si salvano di nuovo e tornano bloccati.
export function ProjectKeyDataForm({
  project,
  unlocks,
}: {
  project: Project;
  unlocks: (ProjectKeyDataUnlock & { unlocked_by_name: string | null })[];
}) {
  const locked = Boolean(project.key_data_locked_at);
  const [saveState, saveAction, saving] = useActionState<KeyDataState, FormData>(saveProjectKeyData, undefined);
  const [unlockState, unlockAction, unlocking] = useActionState<KeyDataState, FormData>(unlockProjectKeyData, undefined);
  const [unlockOpen, setUnlockOpen] = useState(false);

  // Chiude il popup a sblocco riuscito (stesso pattern di payment/edit modal).
  const [prevUnlock, setPrevUnlock] = useState(unlockState);
  if (unlockState !== prevUnlock) {
    setPrevUnlock(unlockState);
    if (unlockState?.success) setUnlockOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {locked ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Colore nel Gantt</p>
              <span
                className="mt-1 block h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: project.color }}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data firma contratto</p>
              <p className="mt-1 font-medium">{formatDate(project.contract_signed_date!)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data inizio lavori</p>
              <p className="mt-1 font-medium">{formatDate(project.work_start_date!)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Bloccati dal {formatDateTime(project.key_data_locked_at!)}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setUnlockOpen(true)}>
              <LockOpen className="h-4 w-4" /> Sblocca
            </Button>
          </div>
        </div>
      ) : (
        <form action={saveAction} className="flex flex-col gap-3">
          <input type="hidden" name="project_id" value={project.id} />
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
          <p className="text-xs text-muted-foreground">
            Salvando con tutti e tre i dati compilati l&apos;area si blocca: per modificarla servirà uno sblocco con
            giustificativo. Senza data di inizio lavori il cantiere resta in &quot;Fase preparatoria&quot;.
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Salvataggio…" : "Salva"}
            </Button>
            {saveState?.success && <span className="text-sm text-status-green">Salvato.</span>}
            {saveState?.error && <span className="text-sm text-status-red">{saveState.error}</span>}
          </div>
        </form>
      )}

      {unlocks.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Sblocchi registrati</p>
          <ul className="flex flex-col gap-1">
            {unlocks.map((u) => (
              <li key={u.id} className="text-xs text-muted-foreground">
                {formatDateTime(u.created_at)}
                {u.unlocked_by_name && ` · ${u.unlocked_by_name}`}: <span className="text-foreground">{u.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={unlockOpen} onClose={() => setUnlockOpen(false)} title="Sblocca dati contrattuali">
        <form action={unlockAction} className="flex flex-col gap-3">
          <input type="hidden" name="project_id" value={project.id} />
          <p className="text-sm text-muted-foreground">
            Colore Gantt, data firma e data inizio lavori torneranno modificabili. Dopo le modifiche va premuto di
            nuovo &quot;Salva&quot; per renderle attive e bloccarle. Il motivo resta registrato.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unlock-reason">Giustificativo</Label>
            <Textarea id="unlock-reason" name="reason" required placeholder="Es. il cliente ha spostato l'inizio lavori" />
          </div>
          {unlockState?.error && <p className="text-sm text-status-red">{unlockState.error}</p>}
          <Button type="submit" disabled={unlocking}>
            {unlocking ? "Sblocco…" : "Sblocca"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
