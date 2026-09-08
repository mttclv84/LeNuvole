"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { changePassword, type ChangePasswordState } from "@/lib/actions/auth";

// redirectTo: usato dalla pagina di primo accesso (/imposta-password) per
// portare il cliente al portale subito dopo aver scelto la password, invece
// di lasciarlo sul semplice messaggio "Password aggiornata" (comportamento
// di default, usato in Impostazioni per un cambio password normale).
export function ChangePasswordForm({
  redirectTo,
  submitLabel = "Aggiorna password",
}: {
  redirectTo?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );

  const [redirecting, setRedirecting] = useState(false);
  if (state?.success && redirectTo && !redirecting) {
    setRedirecting(true);
    router.push(redirectTo);
  }

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nuova password</Label>
        <PasswordInput id="password" name="password" minLength={8} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Conferma nuova password</Label>
        <PasswordInput id="confirm" name="confirm" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-status-green">{redirectTo ? "Password impostata, ti reindirizziamo…" : "Password aggiornata."}</p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvataggio…" : submitLabel}
      </Button>
    </form>
  );
}
