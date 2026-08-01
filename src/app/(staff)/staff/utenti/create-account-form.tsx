"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createAccount, type CreateAccountState } from "./actions";

export function CreateAccountForm() {
  const [state, formAction, pending] = useActionState<CreateAccountState, FormData>(createAccount, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">Nome visualizzato</Label>
          <Input id="display_name" name="display_name" required className="w-56" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="w-64" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password iniziale</Label>
          <Input id="password" name="password" type="text" minLength={8} required className="w-48" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Livello</Label>
          <select id="role" name="role" defaultValue="staff" className="h-10 rounded-md border border-border bg-card px-3 text-sm">
            <option value="staff">Staff</option>
            <option value="owner">Super User</option>
          </select>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Creazione…" : "Crea account"}
        </Button>
      </div>

      {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
      {state?.success && <p className="text-sm text-status-green">Account creato.</p>}
    </form>
  );
}
