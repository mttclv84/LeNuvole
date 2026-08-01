"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateClientRecord, type UpdateClientState } from "./actions";
import type { Profile, Project } from "@/lib/types";

export function EditClientModal({ client, projects }: { client: Profile; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [state, formAction, pending] = useActionState<UpdateClientState, FormData>(updateClientRecord, undefined);

  // Vedi payment-form-modal.tsx: si evita l'useEffect, si aggiorna durante il render.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Modifica cliente"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Modifica cliente">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={client.id} />
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`first_name-${client.id}`}>Nome</Label>
              <Input id={`first_name-${client.id}`} name="first_name" defaultValue={client.first_name ?? ""} required className="w-36" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`last_name-${client.id}`}>Cognome</Label>
              <Input id={`last_name-${client.id}`} name="last_name" defaultValue={client.last_name ?? ""} required className="w-36" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`email-${client.id}`}>Email</Label>
            <Input id={`email-${client.id}`} name="email" type="email" defaultValue={client.email ?? ""} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`phone-${client.id}`}>Telefono</Label>
            <Input id={`phone-${client.id}`} name="phone" type="tel" defaultValue={client.phone ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`address-${client.id}`}>Indirizzo</Label>
            <Input id={`address-${client.id}`} name="address" defaultValue={client.address ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`project_id-${client.id}`}>Cantiere</Label>
            <select
              id={`project_id-${client.id}`}
              name="project_id"
              defaultValue={client.project_id ?? ""}
              className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="">Nessuno</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`notes-${client.id}`}>Commenti</Label>
            <Textarea id={`notes-${client.id}`} name="notes" defaultValue={client.notes ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Password</Label>
            {showPasswordField ? (
              <Input
                name="new_password"
                type="text"
                placeholder="Nuova password (min 8 caratteri)"
                minLength={8}
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <Input value="••••••••" disabled className="text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPasswordField(true)}
                  className="shrink-0 whitespace-nowrap text-xs text-accent hover:underline"
                >
                  Imposta nuova password
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Non è possibile visualizzare la password esistente: è salvata in forma cifrata, per sicurezza.
            </p>
          </div>
          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
