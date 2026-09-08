import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveRefresh } from "@/components/live-refresh";
import { StatusLightCard } from "@/components/status-light";
import { HouseProgress } from "@/components/house-progress";
import { WorkTimeline } from "@/components/work-timeline";
import { GanttChart, type GanttRow } from "@/components/gantt-chart";
import { BudgetSummary } from "@/components/budget-summary";
import { PaymentFormModal } from "@/components/payment-form-modal";
import { getClientContext } from "@/lib/data/client-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  WORK_ITEM_STATUS_LABEL,
  computeWorkProgress,
  workItemStatusColor,
  type BudgetItem,
  type Payment,
  type WorkItem,
} from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, project } = await getClientContext();

  const [{ data: workItems }, { data: budgetItems }, { data: payments }] = await Promise.all([
    supabase.from("work_items").select("*").eq("project_id", project.id).order("start_date"),
    supabase.from("budget_items").select("*").eq("project_id", project.id).order("created_at"),
    supabase.from("payments").select("*").eq("project_id", project.id).order("payment_date", { ascending: false }),
  ]);

  const items = (workItems ?? []) as WorkItem[];
  const progress = computeWorkProgress(items);
  const ganttRows: GanttRow[] = items
    .filter((item) => item.status !== "cancelled")
    .map((item) => ({
      id: item.id,
      title: item.title,
      startDate: item.start_date,
      endDate: item.end_date,
      status: item.status,
    }));
  const confirmedTotal = ((budgetItems ?? []) as BudgetItem[])
    .filter((i) => i.status === "confirmed")
    .reduce((sum, i) => sum + i.amount, 0);
  const paidTotal = ((payments ?? []) as Payment[]).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel={`dashboard-${project.id}`}
        subscriptions={[
          { table: "projects", filter: `id=eq.${project.id}` },
          { table: "work_items", filter: `project_id=eq.${project.id}` },
          { table: "budget_items", filter: `project_id=eq.${project.id}` },
          { table: "payments", filter: `project_id=eq.${project.id}` },
        ]}
      />
      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <StatusLightCard status={project.status_light} reason={project.status_reason} />
        <div className="flex items-center rounded-md border border-border bg-card px-5 py-4">
          <HouseProgress donePercent={progress.donePercent} inProgressPercent={progress.inProgressPercent} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lavorazioni previste</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkItemsList items={items} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avanzamento del cantiere</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkTimeline items={items} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pianificazione lavori</CardTitle>
        </CardHeader>
        <CardContent>
          <GanttChart rows={ganttRows} labelWidth={160} emptyMessage="Nessuna lavorazione pianificata ancora." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Voci budget</CardTitle>
          <PaymentFormModal />
        </CardHeader>
        <CardContent>
          <BudgetSummary items={(budgetItems ?? []) as BudgetItem[]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico pagamenti</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-6 rounded-md bg-muted px-4 py-3 text-sm">
            <p>
              Totale confermato <span className="block font-semibold">{formatCurrency(confirmedTotal)}</span>
            </p>
            <p>
              Pagato <span className="block font-semibold text-status-green">{formatCurrency(paidTotal)}</span>
            </p>
            <p>
              Residuo{" "}
              <span
                className={`block font-semibold ${confirmedTotal - paidTotal > 0 ? "text-status-orange" : "text-status-green"}`}
              >
                {formatCurrency(confirmedTotal - paidTotal)}
              </span>
            </p>
          </div>
          <PaymentsList payments={(payments ?? []) as Payment[]} />
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsList({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Non hai ancora registrato pagamenti.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Badge variant={p.type === "saldo" ? "accent" : "default"}>{p.type === "saldo" ? "Saldo" : "Acconto"}</Badge>
              {formatDate(p.payment_date)}
            </p>
            {p.comment && <p className="mt-1 text-xs text-muted-foreground">{p.comment}</p>}
          </div>
          <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
        </li>
      ))}
    </ul>
  );
}

function WorkItemsList({ items }: { items: WorkItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna lavorazione pubblicata ancora.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const isDone = item.status === "done";
        return (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.start_date)}
                {item.end_date && ` – ${formatDate(item.end_date)}`}
              </p>
            </div>
            <Badge variant={isDone ? "green" : workItemStatusColor(item.status)}>
              {isDone ? "COMPLETATA" : WORK_ITEM_STATUS_LABEL[item.status]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
