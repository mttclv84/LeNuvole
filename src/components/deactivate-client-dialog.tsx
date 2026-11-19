"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";

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
  const valid = reason.trim().length >= 3;

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
          <Button type="submit" variant="destructive" disabled={!valid}>
            Disattiva
          </Button>
        </form>
      </Modal>
    </>
  );
}
