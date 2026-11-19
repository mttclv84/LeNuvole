"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { parseEuroAmount } from "@/lib/utils";

// Disattivazione di un cliente: si apre un popup e la motivazione è
// obbligatoria (resta visibile tra i Disattivati e nei Logs).
export function DeactivateClientDialog({
  clientId,
  clientName,
  action,
}: {
  clientId: string;
  clientName: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [quoteSubject, setQuoteSubject] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  // Preventivo facoltativo, ma se si compila un campo serve anche l'altro.
  const quoteStarted = quoteSubject.trim() !== "" || quoteAmount.trim() !== "";
  const quoteComplete = quoteSubject.trim() !== "" && parseEuroAmount(quoteAmount) > 0;
  const valid = reason.trim().length >= 3 && (!quoteStarted || quoteComplete);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
      >
        Disattiva
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Disattiva cliente">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={clientId} />
          <input type="hidden" name="active" value="false" />
          <p className="text-sm text-muted-foreground">
            Il cliente &quot;{clientName}&quot; non potrà più accedere al portale e passerà tra i Disattivati.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`deactivation-reason-${clientId}`}>Motivazione della disattivazione</Label>
            <Textarea
              id={`deactivation-reason-${clientId}`}
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="es. Lavori conclusi e saldati"
              required
              maxLength={500}
              autoFocus
            />
          </div>
          <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Preventivo presentato e non accettato (facoltativo)
            </legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`quote-subject-${clientId}`}>Oggetto del preventivo</Label>
              <Input
                id={`quote-subject-${clientId}`}
                name="quote_subject"
                value={quoteSubject}
                onChange={(e) => setQuoteSubject(e.target.value)}
                placeholder="es. Ristrutturazione bagno e cucina"
                maxLength={300}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`quote-amount-${clientId}`}>Importo (€)</Label>
              <Input
                id={`quote-amount-${clientId}`}
                name="quote_amount"
                inputMode="decimal"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="es. 25000"
                className="w-40"
              />
            </div>
            {quoteStarted && !quoteComplete && (
              <p className="text-xs text-status-red">Per registrare il preventivo servono oggetto e importo.</p>
            )}
          </fieldset>
          <Button type="submit" variant="destructive" disabled={!valid}>
            Disattiva
          </Button>
        </form>
      </Modal>
    </>
  );
}
