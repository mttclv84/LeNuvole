"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

// Cestino su una voce del Portafoglio cliente: prima di eliminarla va scritta
// la motivazione, che resta nel registro Logs ("Movimenti portafoglio").
export function DeleteWalletItemButton({
  id,
  projectId,
  title,
  amount,
  action,
}: {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-status-red"
        aria-label="Elimina"
        title="Elimina"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Elimina voce">
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
            setReason("");
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="project_id" value={projectId} />
          <p className="text-sm">
            {title} · <span className="font-semibold">{formatCurrency(amount)}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`delete-reason-${id}`}>Motivazione</Label>
            <Textarea
              id={`delete-reason-${id}`}
              name="reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Es. fattura registrata due volte"
            />
            <p className="text-xs text-muted-foreground">La motivazione resta registrata nei Logs.</p>
          </div>
          <Button type="submit" variant="destructive" disabled={!reason.trim()}>
            Elimina
          </Button>
        </form>
      </Modal>
    </>
  );
}
