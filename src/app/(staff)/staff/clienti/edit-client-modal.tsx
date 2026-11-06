"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Link2, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { generateClientAccessLink, updateClientRecord, type UpdateClientState } from "./actions";
import type { Profile } from "@/lib/types";

// I cantieri del cliente si abbinano dal cantiere (Cantieri → Stato lavori → Cliente).
export function EditClientModal({ client }: { client: Profile }) {
  const [open, setOpen] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [state, formAction, pending] = useActionState<UpdateClientState, FormData>(updateClientRecord, undefined);
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkPending, startLinkTransition] = useTransition();

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Appunti non disponibili: il link resta visibile nel campo, si copia a mano.
      setCopied(false);
    }
  }

  function createAccessLink() {
    setLinkError(null);
    setCopied(false);
    startLinkTransition(async () => {
      const result = await generateClientAccessLink(client.id);
      const link = result.link;
      if (!link) {
        setAccessLink(null);
        setLinkError(result.error ?? "Non è stato possibile generare il link.");
        return;
      }
      setAccessLink(link);
      await copyLink(link);
    });
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
                <button
                  type="button"
                  onClick={createAccessLink}
                  disabled={linkPending}
                  title="Crea link di accesso da mandare al cliente"
                  aria-label="Crea link di accesso da mandare al cliente"
                  className="shrink-0 rounded-md border border-border p-1.5 text-accent hover:bg-muted disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            )}
            {linkPending && <p className="text-xs text-muted-foreground">Creo il link…</p>}
            {linkError && <p className="text-xs text-status-red">{linkError}</p>}
            {accessLink && !linkPending && (
              <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted p-2">
                <div className="flex items-center gap-2">
                  <Input value={accessLink} readOnly onFocus={(e) => e.currentTarget.select()} className="text-xs" />
                  <button
                    type="button"
                    onClick={() => copyLink(accessLink)}
                    aria-label="Copia link"
                    className="shrink-0 rounded-md border border-border bg-card p-1.5 hover:bg-muted"
                  >
                    {copied ? <Check className="h-4 w-4 text-status-green" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {copied ? "Link copiato. " : ""}Mandalo al cliente (WhatsApp, email): aprendolo sceglie da solo la
                  sua password ed entra nel portale. Vale una volta sola e scade dopo circa 1 ora.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              La password attuale non è visibile (è cifrata). Una nuova password impostata qui è temporanea: al primo
              accesso il cliente ne sceglie una sua. Con l&apos;icona del link crei invece un link da mandargli.
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
