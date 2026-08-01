"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateAccount, type UpdateAccountState } from "./actions";
import type { Profile } from "@/lib/types";

export function EditAccountModal({ account }: { account: Profile }) {
  const [open, setOpen] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [state, formAction, pending] = useActionState<UpdateAccountState, FormData>(updateAccount, undefined);

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
        aria-label="Modifica account"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Modifica account">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={account.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`display_name-${account.id}`}>Nome visualizzato</Label>
            <Input id={`display_name-${account.id}`} name="display_name" defaultValue={account.display_name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`email-${account.id}`}>Email</Label>
            <Input id={`email-${account.id}`} name="email" type="email" defaultValue={account.email ?? ""} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`role-${account.id}`}>Livello</Label>
            <select
              id={`role-${account.id}`}
              name="role"
              defaultValue={account.role}
              className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="staff">Staff</option>
              <option value="owner">Super User</option>
            </select>
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
