"use client";

// <select> che invia il form contenitore al cambio valore: usato per gli
// stati (lavorazione, fase timeline) nel pannello staff, così l'azione parte
// senza un pulsante extra. Deve essere un Client Component: un handler
// onChange non può stare su un elemento reso da un Server Component.
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className ?? "h-8 rounded-md border border-border bg-card px-2 text-xs"}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
