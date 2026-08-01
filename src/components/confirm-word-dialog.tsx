"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

// Dialog di conferma "a scrittura": per azioni delicate (disattivazione
// cantiere) non basta un click, bisogna scrivere la parola indicata.
export function ConfirmWordDialog({
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
  title,
  description,
  word,
  action,
  hiddenFields,
}: {
  triggerLabel: ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  title: string;
  description: string;
  word: string;
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toUpperCase() === word.toUpperCase();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName} aria-label={triggerAriaLabel}>
        {triggerLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form action={action} className="flex flex-col gap-4">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-word">
              Scrivi <span className="font-semibold text-foreground">{word}</span> per confermare
            </Label>
            <Input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" variant="destructive" disabled={!confirmed}>
            Conferma
          </Button>
        </form>
      </Modal>
    </>
  );
}
