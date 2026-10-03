import { TIME_AREAS, TIME_AREA_LABEL, type TimeArea } from "@/lib/types";

// Tre pulsanti grandi (Progetto / Preventivazione / Cantiere) al posto di un
// menu a tendina: su telefono si sceglie con un tocco. Sono radio nativi, quindi
// il valore viaggia con il form come campo "area".
export function AreaPicker({ defaultArea, name = "area" }: { defaultArea?: TimeArea; name?: string }) {
  return (
    <fieldset className="grid grid-cols-3 gap-2">
      <legend className="sr-only">Area</legend>
      {TIME_AREAS.map((area) => (
        <label key={area} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={area}
            defaultChecked={area === defaultArea}
            required
            className="peer sr-only"
          />
          <span className="flex h-12 items-center justify-center rounded-md border border-border bg-card px-1 text-center text-xs font-medium leading-tight transition-colors hover:bg-muted peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent sm:text-sm">
            {TIME_AREA_LABEL[area]}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
