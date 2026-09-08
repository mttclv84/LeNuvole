"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Input file custom: il testo del pulsante nativo del browser ("Scegli
// file"/"Nessun file scelto") non e' modificabile via CSS, quindi lo
// nascondiamo (opacity 0, non display:none, per non perdere la validazione
// nativa di "required") sotto un pulsante disegnato da noi, e mostriamo noi
// il nome del file scelto con un tasto per rimuoverlo.
export function FileInput({
  id,
  name,
  required,
  accept,
  className,
}: {
  id: string;
  name: string;
  required?: boolean;
  accept?: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName(null);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-bold hover:bg-muted">
        Scegli il file
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          required={required}
          accept={accept}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      {fileName && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="max-w-40 truncate">{fileName}</span>
          <button
            type="button"
            onClick={clear}
            aria-label="Rimuovi file scelto"
            className="rounded p-0.5 hover:bg-muted hover:text-status-red"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  );
}
