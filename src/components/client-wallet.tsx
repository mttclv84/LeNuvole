import { Banknote, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BUDGET_KIND_LABEL, computeWallet, type BudgetItem } from "@/lib/types";

// Azioni disponibili solo nel pannello staff: il cliente vede le stesse
// voci in sola lettura.
type StaffActions = {
  projectId: string;
  setInvoicePaid: (formData: FormData) => Promise<void>;
  deleteItem: (formData: FormData) => Promise<void>;
};

// Portafoglio cliente: conferme d'ordine (il conto da pagare) e, sotto, le
// fatture emesse con lo stato "da saldare" / "SALDATA".
export function ClientWallet({ items, staff }: { items: BudgetItem[]; staff?: StaffActions }) {
  const { orders, invoices, orderTotal } = computeWallet(items);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">Conferme d&apos;ordine</p>
          <p className="text-sm">
            Totale da pagare <span className="font-semibold">{formatCurrency(orderTotal)}</span>
          </p>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna conferma d&apos;ordine ancora.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {orders.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
                  {staff && <DeleteItem staff={staff} id={item.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="mb-2 text-sm font-medium">Fatture</p>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna fattura emessa ancora.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {invoices.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {BUDGET_KIND_LABEL[item.kind]}
                    {item.label !== BUDGET_KIND_LABEL[item.kind] && (
                      <span className="font-normal text-muted-foreground"> · {item.label}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Emessa il {formatDate(item.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
                  {item.paid_at ? (
                    <Badge variant="green" className="font-semibold">
                      SALDATA il {formatDate(item.paid_at)}
                    </Badge>
                  ) : (
                    <Badge variant="orange">da saldare</Badge>
                  )}
                  {staff && (
                    <form action={staff.setInvoicePaid}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="project_id" value={staff.projectId} />
                      <input type="hidden" name="paid" value={item.paid_at ? "false" : "true"} />
                      {item.paid_at ? (
                        <button type="submit" className="text-xs text-muted-foreground hover:underline">
                          annulla
                        </button>
                      ) : (
                        <button
                          type="submit"
                          title="Segna come saldata (data di oggi)"
                          aria-label="Segna come saldata"
                          className="rounded-md p-1.5 text-status-green hover:bg-status-green/10"
                        >
                          <Banknote className="h-4 w-4" />
                        </button>
                      )}
                    </form>
                  )}
                  {staff && <DeleteItem staff={staff} id={item.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Storico pagamenti: totali e fatture saldate, dalla più recente.
export function PaymentsHistory({ items, emptyLabel }: { items: BudgetItem[]; emptyLabel: string }) {
  const { invoices, orderTotal, invoicedTotal, paidTotal, residual } = computeWallet(items);
  const paid = invoices
    .filter((i) => i.paid_at)
    .sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 rounded-md bg-muted px-4 py-3 text-sm sm:grid-cols-4">
        <p>
          Totale ordine <span className="block font-semibold">{formatCurrency(orderTotal)}</span>
        </p>
        <p>
          Fatturato <span className="block font-semibold">{formatCurrency(invoicedTotal)}</span>
        </p>
        <p>
          Saldato <span className="block font-semibold text-status-green">{formatCurrency(paidTotal)}</span>
        </p>
        <p>
          Residuo{" "}
          <span className={`block font-semibold ${residual > 0 ? "text-status-orange" : "text-status-green"}`}>
            {formatCurrency(residual)}
          </span>
        </p>
      </div>

      {paid.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {paid.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <Badge variant="green">SALDATA</Badge>
                  {formatDate(p.paid_at!)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {BUDGET_KIND_LABEL[p.kind]}
                  {p.label !== BUDGET_KIND_LABEL[p.kind] && ` · ${p.label}`}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeleteItem({ staff, id }: { staff: StaffActions; id: string }) {
  return (
    <form action={staff.deleteItem}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="project_id" value={staff.projectId} />
      <button
        type="submit"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-status-red"
        aria-label="Elimina"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
