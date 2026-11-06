"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

// Icona dei soldi su una fattura "da saldare": apre un popup con la data del
// pagamento (proposta: oggi), che si conferma o si corregge prima di salvare.
export function PayInvoiceButton({
  id,
  projectId,
  title,
  amount,
  today,
  action,
}: {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  // Data di oggi in Italia (YYYY-MM-DD), calcolata sul server.
  today: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Segna come saldata"
        aria-label="Segna come saldata"
        className="rounded-md p-1.5 text-status-green hover:bg-status-green/10"
      >
        <Banknote className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Fattura saldata">
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="paid" value="true" />
          <p className="text-sm">
            {title} · <span className="font-semibold">{formatCurrency(amount)}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`paid_date-${id}`}>Data del pagamento</Label>
            <Input id={`paid_date-${id}`} name="paid_date" type="date" defaultValue={today} max={today} required />
            <p className="text-xs text-muted-foreground">
              Conferma la data di oggi o correggila con quella effettiva del pagamento. La data di registrazione viene
              salvata in automatico.
            </p>
          </div>
          <Button type="submit">Salva</Button>
        </form>
      </Modal>
    </>
  );
}
