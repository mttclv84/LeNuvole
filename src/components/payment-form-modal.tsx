"use client";

import { useActionState, useState } from "react";
import { Wallet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { addPayment, type AddPaymentState } from "@/app/(client)/actions";

export function PaymentFormModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AddPaymentState, FormData>(addPayment, undefined);

  // Chiude il modal quando l'invio va a buon fine, senza un useEffect:
  // si confronta lo stato con l'ultimo visto e si aggiorna durante il
  // render (pattern consigliato da React per "sincronizzare" stato locale
  // con un valore esterno che cambia — vedi react-hooks/set-state-in-effect).
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-accent hover:bg-accent/10"
        aria-label="Registra un pagamento"
        title="Registra un pagamento"
      >
        <Wallet className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Registra un pagamento">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              name="type"
              defaultValue="acconto"
              className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="acconto">Acconto</option>
              <option value="saldo">Saldo</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_date">Data</Label>
            <Input id="payment_date" name="payment_date" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Importo €</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comment">Commento (facoltativo)</Label>
            <Textarea id="comment" name="comment" placeholder="Es. bonifico effettuato il..." />
          </div>
          {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Invio…" : "Invia"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
