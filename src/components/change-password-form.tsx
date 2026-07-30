"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changePassword, type ChangePasswordState } from "@/lib/actions/auth";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nuova password</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Conferma nuova password</Label>
        <Input id="confirm" name="confirm" type="password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
      {state?.success && <p className="text-sm text-status-green">Password aggiornata.</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvataggio…" : "Aggiorna password"}
      </Button>
    </form>
  );
}
