"use client";

import { useActionState, useState } from "react";
import { Check, Link2, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateClientRecord, type UpdateClientState } from "./actions";
import type { Profile } from "@/lib/types";

// I cantieri del cliente si abbinano dal cantiere (Cantieri → Stato lavori → Cliente).
export function EditClientModal({ client }: { client: Profile }) {
  const [open, setOpen] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [state, formAction, pending] = useActionState<UpdateClientState, FormData>(updateClientRecord, undefined);
  const [loginLink, setLoginLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Link alla pagina di accesso del portale (email + password): non scade e
  // vale per tutti, si manda al cliente insieme alla password temporanea.
  async function copyLoginLink() {
    const link = `${window.location.origin}/login`;
    setLoginLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Appunti non disponibili: il link resta visibile nel campo, si copia a mano.
      setCopied(false);
    }
  }

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

      <Modal open={open} onClose={() => setOpen(false)} title="Modifica cliente" size="medium">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={client.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`first_name-${client.id}`}>Nome</Label>
              <Input id={`first_name-${client.id}`} name="first_name" defaultValue={client.first_name ?? ""} required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`last_name-${client.id}`}>Cognome</Label>
              <Input id={`last_name-${client.id}`} name="last_name" defaultValue={client.last_name ?? ""} required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`email-${client.id}`}>Email</Label>
              <Input id={`email-${client.id}`} name="email" type="email" defaultValue={client.email ?? ""} required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`phone-${client.id}`}>Telefono</Label>
              <Input id={`phone-${client.id}`} name="phone" type="tel" defaultValue={client.phone ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`address-${client.id}`}>Indirizzo</Label>
            <Input id={`address-${client.id}`} name="address" defaultValue={client.address ?? ""} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`notes-${client.id}`}>Commenti</Label>
            <Textarea id={`notes-${client.id}`} name="notes" rows={2} defaultValue={client.notes ?? ""} className="min-h-14" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Password</Label>
            <div className="flex items-center gap-2">
              {showPasswordField ? (
                <Input
                  name="new_password"
                  type="text"
                  placeholder="Nuova password (min 8 caratteri)"
                  minLength={8}
                  autoFocus
                />
              ) : (
                <>
                  <Input value="••••••••" disabled className="text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPasswordField(true)}
                    className="shrink-0 whitespace-nowrap text-xs text-accent hover:underline"
                  >
                    Imposta nuova password
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={copyLoginLink}
                title="Copia il link alla pagina di accesso"
                aria-label="Copia il link alla pagina di accesso"
                className="shrink-0 rounded-md border border-border p-1.5 text-accent hover:bg-muted"
              >
                {copied ? <Check className="h-4 w-4 text-status-green" /> : <Link2 className="h-4 w-4" />}
              </button>
            </div>
            {loginLink && (
              <div className="flex flex-col gap-1 rounded-md border border-border bg-muted p-2">
                <Input value={loginLink} readOnly onFocus={(e) => e.currentTarget.select()} className="text-xs" />
                <p className="text-xs text-muted-foreground">
                  {copied ? "Link copiato. " : ""}Mandalo al cliente con la sua email e la password: lo porta alla
                  pagina di accesso del portale.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              La password attuale non è visibile (è cifrata). Una nuova password impostata qui è temporanea: al primo
              accesso il cliente ne sceglie una sua.
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
