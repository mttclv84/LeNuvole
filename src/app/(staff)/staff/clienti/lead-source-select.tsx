import { LEAD_SOURCE_LABEL, type LeadSource } from "@/lib/types";
import { cn } from "@/lib/utils";

// Menu "Aggancio" (come il cliente è arrivato a Le Nuvole): obbligatorio.
export function LeadSourceSelect({
  id,
  defaultValue,
  className,
}: {
  id: string;
  defaultValue?: LeadSource | null;
  className?: string;
}) {
  return (
    <select
      id={id}
      name="lead_source"
      required
      defaultValue={defaultValue ?? ""}
      className={cn("h-10 rounded-md border border-border bg-card px-3 text-sm", className)}
    >
      <option value="" disabled>
        Seleziona…
      </option>
      {(Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((k) => (
        <option key={k} value={k}>
          {LEAD_SOURCE_LABEL[k]}
        </option>
      ))}
    </select>
  );
}
