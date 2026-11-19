import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveRefresh } from "@/components/live-refresh";
import { getStaffContext, requireAllowed } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { cn, formatCurrency, formatDate, todayInItaly } from "@/lib/utils";
import { BUDGET_KIND_LABEL, computeWallet, isInvoice, type BudgetItem, type Profile, type Project } from "@/lib/types";

// Cashflow (solo Super User): panoramica di tutti i Portafogli cliente.
// L'ordinato di ogni cantiere si scompone in tre parti che sommano sempre al
// totale, usate sia nei totali in alto sia nelle barre per cantiere:
//   incassato  +  fatture emesse da incassare  +  ancora da fatturare.

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

type Breakdown = { ordered: number; paid: number; toCollect: number; toInvoice: number };

function breakdown(items: BudgetItem[]): Breakdown {
  const w = computeWallet(items);
  return {
    ordered: w.orderTotal,
    paid: w.paidTotal,
    toCollect: w.invoicedTotal - w.paidTotal,
    // Se si è fatturato più dell'ordinato non c'è nulla da fatturare.
    toInvoice: Math.max(w.orderTotal - w.invoicedTotal, 0),
  };
}

export default async function CashflowPage({ searchParams }: { searchParams: Promise<{ anno?: string }> }) {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.viewCashflow(profile.role));

  const currentYear = Number(todayInItaly().slice(0, 4));
  const { anno } = await searchParams;
  const year = anno && /^\d{4}$/.test(anno) ? Number(anno) : currentYear;

  const [{ data: projectRows }, { data: clientRows }, { data: itemRows }] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("profiles").select("*").eq("role", "client"),
    supabase.from("budget_items").select("*").order("created_at", { ascending: false }).range(0, 9999),
  ]);
  const projects = (projectRows ?? []) as Project[];
  const clientNameById = new Map(((clientRows ?? []) as Profile[]).map((c) => [c.id, c.display_name]));
  const items = ((itemRows ?? []) as BudgetItem[]).map((i) => ({ ...i, amount: Number(i.amount) }));

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const itemsByProject = new Map<string, BudgetItem[]>();
  for (const i of items) {
    const list = itemsByProject.get(i.project_id) ?? [];
    list.push(i);
    itemsByProject.set(i.project_id, list);
  }

  const totals = breakdown(items);

  // Righe per cantiere: solo quelli con almeno una voce, dal più grande.
  const rows = [...itemsByProject.entries()]
    .map(([projectId, list]) => {
      const p = projectById.get(projectId);
      return {
        id: projectId,
        name: p?.client_label ?? "Cantiere eliminato",
        client: p?.client_id ? clientNameById.get(p.client_id) : undefined,
        archived: p?.is_archived ?? false,
        ...breakdown(list),
      };
    })
    .sort((a, b) => b.ordered - a.ordered);
  const rowScale = Math.max(...rows.map((r) => Math.max(r.ordered, r.paid + r.toCollect)), 0);

  // Incassi mese per mese dell'anno scelto (data effettiva del pagamento).
  const monthly = MONTHS.map(() => 0);
  const paidYears = new Set<number>([currentYear]);
  for (const i of items) {
    if (!isInvoice(i) || !i.paid_at) continue;
    const y = Number(i.paid_at.slice(0, 4));
    paidYears.add(y);
    if (y === year) monthly[Number(i.paid_at.slice(5, 7)) - 1] += i.amount;
  }
  const yearTotal = monthly.reduce((s, v) => s + v, 0);
  const monthMax = Math.max(...monthly, 0);
  const minYear = Math.min(...paidYears);

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh channel="staff-cashflow" subscriptions={[{ table: "budget_items" }]} />

      {/* Totaloni */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Ordinato" value={totals.ordered} hint="Conferme d'ordine" strong />
        <StatTile label="Incassato" value={totals.paid} hint="Fatture pagate" swatch="bg-accent" />
        <StatTile label="Da incassare" value={totals.toCollect} hint="Fatture emesse non pagate" swatch="bg-brand-taupe" />
        <StatTile label="Da fatturare" value={totals.toInvoice} hint="Ordinato non ancora fatturato" swatch="bg-muted" />
      </div>

      {/* Incassi per mese */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Incassi per mese</CardTitle>
            <CardDescription>
              Totale {year}: <span className="font-semibold text-foreground">{formatCurrency(yearTotal)}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            <YearLink year={year - 1} disabled={year <= minYear} label="Anno precedente">
              <ChevronLeft className="h-4 w-4" />
            </YearLink>
            <span className="w-12 text-center">{year}</span>
            <YearLink year={year + 1} disabled={year >= currentYear} label="Anno successivo">
              <ChevronRight className="h-4 w-4" />
            </YearLink>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-1 border-b border-border sm:gap-2">
            {monthly.map((v, m) => {
              const isPeak = v > 0 && v === monthMax;
              return (
                <div key={m} className="group relative flex h-full flex-1 flex-col justify-end">
                  {/* Etichetta diretta solo sul mese più alto; gli altri al passaggio del mouse. */}
                  <span
                    className={cn(
                      "pointer-events-none mb-1 text-center text-[10px] font-medium text-foreground sm:text-xs",
                      isPeak ? "block" : "hidden group-hover:block",
                    )}
                  >
                    {v > 0 ? formatCurrency(v) : "—"}
                  </span>
                  <div
                    title={`${MONTHS[m]} ${year}: ${formatCurrency(v)}`}
                    className={cn("w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80", v === 0 && "bg-transparent")}
                    style={{ height: monthMax > 0 ? `${(v / monthMax) * 80}%` : 0 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 sm:gap-2">
            {MONTHS.map((m) => (
              <span key={m} className="flex-1 text-center text-[10px] text-muted-foreground sm:text-xs">
                {m}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per cantiere */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Per cantiere</CardTitle>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <LegendItem swatch="bg-accent" label="Incassato" />
            <LegendItem swatch="bg-brand-taupe" label="Da incassare" />
            <LegendItem swatch="bg-muted border border-border" label="Da fatturare" />
          </ul>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna voce nei portafogli clienti.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 sm:w-56 sm:shrink-0">
                    <Link href={`/staff/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    {r.archived && (
                      <Badge variant="red" className="ml-2">
                        Disattivato
                      </Badge>
                    )}
                    <p className="truncate text-xs text-muted-foreground">{r.client ?? "—"}</p>
                  </div>
                  <WalletBar row={r} scale={rowScale} />
                  <div className="grid shrink-0 grid-cols-4 gap-2 text-right text-xs tabular-nums sm:w-96">
                    <Amount label="Ordinato" value={r.ordered} strong />
                    <Amount label="Incassato" value={r.paid} />
                    <Amount label="Da incassare" value={r.toCollect} />
                    <Amount label="Da fatturare" value={r.toInvoice} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Storico completo */}
      <Card>
        <CardHeader>
          <CardTitle>Storico movimenti</CardTitle>
          <CardDescription>Tutte le voci dei portafogli clienti, dalla più recente.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Cantiere</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Descrizione</th>
                <th className="py-2 pr-3 text-right font-medium">Importo</th>
                <th className="py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{formatDate(i.created_at)}</td>
                  <td className="py-2 pr-3">{projectById.get(i.project_id)?.client_label ?? "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-3">{BUDGET_KIND_LABEL[i.kind]}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{i.label}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-medium tabular-nums">
                    {formatCurrency(i.amount)}
                  </td>
                  <td className="whitespace-nowrap py-2 text-xs">
                    {!isInvoice(i) ? (
                      <span className="text-muted-foreground">—</span>
                    ) : i.paid_at ? (
                      <Badge variant="green">Pagata il {formatDate(i.paid_at)}</Badge>
                    ) : (
                      <Badge variant="accent">Da incassare</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  swatch,
  strong,
}: {
  label: string;
  value: number;
  hint: string;
  swatch?: string;
  strong?: boolean;
}) {
  return (
    <Card className={cn(strong && "bg-brand-black text-white")}>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className={cn("flex items-center gap-1.5 text-xs font-medium", strong ? "text-white/70" : "text-muted-foreground")}>
          {swatch && <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm border border-border", swatch)} />}
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(value)}</p>
        <p className={cn("text-xs", strong ? "text-white/60" : "text-muted-foreground")}>{hint}</p>
      </CardContent>
    </Card>
  );
}

function YearLink({
  year,
  disabled,
  label,
  children,
}: {
  year: number;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-md p-1.5 text-muted-foreground/40">{children}</span>;
  }
  return (
    <Link href={`/staff/cashflow?anno=${year}`} aria-label={label} className="rounded-md p-1.5 hover:bg-muted">
      {children}
    </Link>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block h-3 w-3 rounded-sm", swatch)} /> {label}
    </li>
  );
}

function Amount({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn(strong ? "font-semibold" : "text-muted-foreground", value === 0 && !strong && "opacity-50")}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// Barra dell'ordinato del cantiere, sulla stessa scala per tutti i cantieri:
// incassato + da incassare + da fatturare. I valori sono comunque scritti
// accanto, il colore non è mai l'unica informazione.
function WalletBar({ row, scale }: { row: Breakdown; scale: number }) {
  const parts = [
    { key: "paid", value: row.paid, className: "bg-accent", label: "Incassato" },
    { key: "toCollect", value: row.toCollect, className: "bg-brand-taupe", label: "Da incassare" },
    { key: "toInvoice", value: row.toInvoice, className: "bg-muted border border-border", label: "Da fatturare" },
  ].filter((p) => p.value > 0);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const width = scale > 0 ? (total / scale) * 100 : 0;

  return (
    <div className="h-3 min-w-0 flex-1">
      {total > 0 && (
        <div className="flex h-full gap-0.5" style={{ width: `${Math.max(width, 2)}%` }}>
          {parts.map((p) => (
            <div
              key={p.key}
              title={`${p.label}: ${formatCurrency(p.value)}`}
              className={cn("h-full rounded-[4px]", p.className)}
              style={{ flexGrow: p.value, flexBasis: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
