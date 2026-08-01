import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/logo";
import { logout } from "@/lib/actions/auth";

// Pagina mostrata (dal proxy) a un cliente che ha effettuato il login ma non
// ha ancora un cantiere abbinato — es. registrato da poco, in attesa che lo
// staff colleghi il suo profilo a un cantiere in fase di creazione.
export default function NessunCantierePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-8 text-center shadow-lg">
        <div className="mb-4 flex flex-col items-center">
          <Logo />
        </div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-status-orange/10">
          <AlertTriangle className="h-6 w-6 text-status-orange" />
        </div>
        <h1 className="text-lg font-semibold">Non hai ancora un cantiere attivato</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Il tuo account è registrato, ma non è ancora collegato a un cantiere. Appena Le Nuvole lo attiverà,
          lo troverai qui automaticamente al prossimo accesso.
        </p>
        <form action={logout} className="mt-6">
          <button type="submit" className="text-sm text-accent hover:underline">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
