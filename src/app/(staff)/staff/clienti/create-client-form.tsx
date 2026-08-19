"use client";

import { useActionState, useRef, useState } from "react";
import { Download, Copy } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClientRecord, type CreateClientState } from "./actions";
import type { Project } from "@/lib/types";

export function CreateClientForm({ projects }: { projects: Project[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<CreateClientState, FormData>(createClientRecord, undefined);

  // Vedi edit-client-modal.tsx: si evita l'useEffect, si aggiorna durante il render.
  const [prevState, setPrevState] = useState(state);
  const [qrOpen, setQrOpen] = useState(false);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setQrOpen(true);
  }

  function closeQrAndReset() {
    setQrOpen(false);
    formRef.current?.reset();
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first_name">Nome</Label>
            <Input id="first_name" name="first_name" required className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_name">Cognome</Label>
            <Input id="last_name" name="last_name" required className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required className="w-64" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" type="tel" className="w-48" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Indirizzo</Label>
            <Input id="address" name="address" className="w-64" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project_id">Cantiere (facoltativo)</Label>
            <select id="project_id" name="project_id" className="h-10 w-56 rounded-md border border-border bg-card px-3 text-sm">
              <option value="">Nessuno per ora</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Commenti</Label>
          <Textarea id="notes" name="notes" placeholder="Note facoltative sul cliente" />
        </div>

        <p className="text-xs text-muted-foreground">
          Nessuna password da scegliere: alla registrazione viene generato un QR con cui il cliente accede al
          portale la prima volta e imposta da sé la propria password.
        </p>

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creazione…" : "Registra cliente"}
          </Button>
        </div>

        {state && !state.success && <p className="text-sm text-status-red">{state.error}</p>}
      </form>

      {state?.success && (
        <Modal open={qrOpen} onClose={closeQrAndReset} title="Accesso al portale">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              {state.clientName} è stato registrato. Fai inquadrare questo QR dal suo telefono (o condividi il
              link) per il primo accesso: da lì potrà scegliere la propria password.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale generata server-side, non un asset ottimizzabile */}
            <img src={state.qrDataUrl} alt="QR di accesso al portale" className="h-56 w-56 rounded-md border border-border" />
            <div className="flex w-full gap-2">
              <a
                href={state.qrDataUrl}
                download={`qr-accesso-${state.clientName.toLowerCase().replace(/\s+/g, "-")}.png`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <Download className="h-4 w-4" /> Scarica QR
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(state.accessLink)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <Copy className="h-4 w-4" /> Copia link
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Il link è a uso singolo e ha una validità limitata nel tempo.</p>
            <Button type="button" onClick={closeQrAndReset} className="w-full">
              Fatto
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
