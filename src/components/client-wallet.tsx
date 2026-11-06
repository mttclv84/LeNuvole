import { Trash2 } from "lucide-react";
import { PayInvoiceButton } from "@/components/pay-invoice-button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime, todayInItaly } from "@/lib/utils";
import { BUDGET_KIND_LABEL, computeWallet, type BudgetItem } from "@/lib/types";

// Azioni disponibili solo nel pannello staff: il cliente vede le stesse
// voci in sola lettura.
type StaffActions = {
  projectId: string;
  // Nomi delle utenze staff: chi ha registrato / saldato ogni voce.
  userNameById: Map<string, string>;
  setInvoicePaid: (formData: FormData) => Promise<void>;
  deleteItem: (formData: FormData) => Promise<void>;
};

// Portafoglio cliente: conferme d'ordine (il conto da pagare) e, sotto, le
// fatture emesse con lo stato "da saldare" / "SALDATA".
export function ClientWallet({ items, staff }: { items: BudgetItem[]; staff?: StaffActions }) {
  const { orders, invoices, orderTotal } = computeWallet(items);
  const today = todayInItaly();

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
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                    <ByUser staff={staff} id={item.created_by} prefix="registrata da" />
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Emessa il {formatDate(item.created_at)}
                    <ByUser staff={staff} id={item.created_by} prefix="registrata da" />
                  </p>
                  {item.paid_at && (
                    <p className="text-xs text-muted-foreground">
                      Saldo registrato{item.paid_recorded_at && ` il ${formatDateTime(item.paid_recorded_at)}`}
                      <ByUser staff={staff} id={item.paid_by} prefix="da" />
                    </p>
                  )}
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
                  {staff &&
                    (item.paid_at ? (
                      <form action={staff.setInvoicePaid}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="project_id" value={staff.projectId} />
                        <input type="hidden" name="paid" value="false" />
                        <button type="submit" className="text-xs text-muted-foreground hover:underline">
                          annulla
                        </button>
                      </form>
                    ) : (
                      <PayInvoiceButton
                        id={item.id}
                        projectId={staff.projectId}
                        title={BUDGET_KIND_LABEL[item.kind]}
                        amount={item.amount}
                        today={today}
                        action={staff.setInvoicePaid}
                      />
                    ))}
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
export function PaymentsHistory({
  items,
  emptyLabel,
  userNameById,
}: {
  items: BudgetItem[];
  emptyLabel: string;
  // Solo nel pannello staff: nome dell'utenza che ha registrato il saldo.
  userNameById?: Map<string, string>;
}) {
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
                {p.paid_recorded_at && (
                  <p className="text-xs text-muted-foreground">
                    Registrato il {formatDateTime(p.paid_recorded_at)}
                    {userNameById && p.paid_by && userNameById.get(p.paid_by) && ` da ${userNameById.get(p.paid_by)}`}
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// " · registrata da Commerciale": solo nel pannello staff (il cliente non
// può leggere i profili dello staff e vede sempre "Team Le Nuvole").
function ByUser({ staff, id, prefix }: { staff?: StaffActions; id: string | null; prefix: string }) {
  const name = staff && id ? staff.userNameById.get(id) : undefined;
  if (!name) return null;
  return (
    <>
      {" "}
      · {prefix} <span className="text-foreground">{name}</span>
    </>
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
