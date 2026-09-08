"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // "large": per contenuti che hanno bisogno di più spazio per essere
  // leggibili (es. il Gantt), non per i soliti form.
  size?: "default" | "large";
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Chiudi" className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 flex w-full flex-col rounded-md border border-border bg-card p-6 shadow-lg",
          size === "large" ? "max-w-5xl max-h-[90vh]" : "max-w-sm",
        )}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn(size === "large" && "overflow-auto")}>{children}</div>
      </div>
    </div>
  );
}
