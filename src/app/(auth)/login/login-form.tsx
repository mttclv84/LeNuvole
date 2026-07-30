"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { login, type LoginState } from "./actions";

export function LoginForm({ next, disabled }: { next?: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      {disabled && (
        <p className="rounded-md bg-status-orange/10 px-3 py-2 text-sm text-status-orange">
          Il tuo account è stato disattivato. Contatta Le Nuvole per maggiori informazioni.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nome@esempio.it" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state?.error && <p className="text-sm text-status-red">{state.error}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
