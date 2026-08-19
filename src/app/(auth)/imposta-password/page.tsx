import Link from "next/link";
import { Logo } from "@/components/logo";
import { ChangePasswordForm } from "@/components/change-password-form";
import { createClient } from "@/lib/supabase/server";

// Pagina di primo accesso raggiunta dal QR generato alla creazione del
// cliente (vedi staff/clienti/actions.ts + /auth/confirm): a quel punto la
// sessione è già stabilita dal token_hash, qui il cliente sceglie la
// propria password prima di entrare nel portale.
export default async function ImpostaPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-semibold">Benvenuto/a in Le Nuvole</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? "Scegli la password con cui accederai al tuo portale."
              : "Il link non è più valido: potrebbe essere scaduto o già stato usato."}
          </p>
        </div>

        {user ? (
          <ChangePasswordForm redirectTo="/" submitLabel="Entra nel portale" />
        ) : (
          <Link href="/login" className="text-sm text-accent hover:underline">
            Vai al login
          </Link>
        )}
      </div>
    </div>
  );
}
