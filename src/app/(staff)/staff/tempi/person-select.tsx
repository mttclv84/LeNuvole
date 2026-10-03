import { Label } from "@/components/ui/input";
import type { TimePerson } from "@/lib/types";

// Menu "Persona": i tempi si attribuiscono a chi sceglie qui, non all'account
// con cui si è entrati (gli accessi sono condivisi). Le persone non più
// attive non compaiono tra le scelte.
export function PersonSelect({
  id,
  people,
  defaultPersonId,
}: {
  id: string;
  people: Pick<TimePerson, "id" | "name">[];
  defaultPersonId?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Persona</Label>
      <select
        id={id}
        name="person_id"
        required
        defaultValue={defaultPersonId ?? ""}
        className="h-12 w-full rounded-md border border-border bg-card px-3 text-sm"
      >
        <option value="" disabled>
          Seleziona…
        </option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
