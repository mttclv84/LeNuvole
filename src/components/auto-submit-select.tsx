"use client";

// <select> che invia il form contenitore al cambio valore: usato per gli
// stati (lavorazione) nel pannello staff, così l'azione parte senza un
// pulsante extra. Deve essere un Client Component: un handler onChange non
// può stare su un elemento reso da un Server Component.
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string; optionColor?: string }[];
  className?: string;
}) {
  // Il colore non deve comparire solo tra le opzioni aperte, ma restare
  // visibile anche sulla casella chiusa una volta selezionata una voce.
  const currentColor = options.find((o) => o.value === defaultValue)?.optionColor;

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className ?? "h-8 rounded-md border border-border bg-card px-2 text-xs"}
      style={currentColor ? { backgroundColor: currentColor } : undefined}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={o.optionColor ? { backgroundColor: o.optionColor } : undefined}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
