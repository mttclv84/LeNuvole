"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Come FileInput ma con selezione multipla: i file scelti sono gestiti dal
// componente padre (lista con tasto per togliere il singolo file). Scegliere
// di nuovo li aggiunge a quelli già selezionati invece di sostituirli.
export function MultiFileInput({
  id,
  accept,
  files,
  onChange,
  disabled,
  className,
}: {
  id: string;
  accept?: string;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-bold shadow-elev-1 hover:bg-muted",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {files.length === 0 ? "Scegli i file" : "Aggiungi altri file"}
        <input
          id={id}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            onChange([...files, ...picked]);
            e.target.value = "";
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="max-w-64 truncate">{f.name}</span>
              <span className="shrink-0">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  aria-label={`Togli ${f.name}`}
                  className="rounded p-0.5 hover:bg-muted hover:text-status-red"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
