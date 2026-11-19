import { Button } from "@/components/ui/button";

// Pulsante "Carica" dei moduli a più file + elenco dei file non riusciti.
export function UploadProgressButton({
  busy,
  progress,
  count,
}: {
  busy: boolean;
  progress: { done: number; total: number } | null;
  count: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium opacity-0" aria-hidden>
        &nbsp;
      </span>
      <Button type="submit" disabled={busy || count === 0}>
        {busy && progress
          ? `Caricamento ${progress.done}/${progress.total}…`
          : count > 1
            ? `Carica ${count} file`
            : "Carica"}
      </Button>
    </div>
  );
}

export function UploadErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="w-full text-xs text-status-red">
      {errors.map((e) => (
        <li key={e}>Non caricato: {e}</li>
      ))}
    </ul>
  );
}
