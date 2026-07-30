import { formatCurrency } from "@/lib/utils";
import type { BudgetItem } from "@/lib/types";

export function BudgetSummary({ items }: { items: BudgetItem[] }) {
  const confirmed = items.filter((i) => i.status === "confirmed");
  const pending = items.filter((i) => i.status === "pending");
  const totalConfirmed = confirmed.reduce((sum, i) => sum + i.amount, 0);
  const totalPending = pending.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BudgetGroup title="Confermate" total={totalConfirmed} items={confirmed} tone="green" />
      <BudgetGroup title="Da confermare" total={totalPending} items={pending} tone="orange" />
    </div>
  );
}

function BudgetGroup({
  title,
  total,
  items,
  tone,
}: {
  title: string;
  total: number;
  items: BudgetItem[];
  tone: "green" | "orange";
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium">{title}</p>
        <p className={tone === "green" ? "text-status-green font-semibold" : "text-status-orange font-semibold"}>
          {formatCurrency(total)}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna voce.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span>{formatCurrency(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
