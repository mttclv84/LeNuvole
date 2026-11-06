import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveRefresh } from "@/components/live-refresh";
import { StatusLightCard } from "@/components/status-light";
import { HouseProgress } from "@/components/house-progress";
import { WorkTimeline } from "@/components/work-timeline";
import type { GanttRow } from "@/components/gantt-chart";
import { GanttPopup } from "@/components/gantt-popup";
import { ClientWallet, PaymentsHistory } from "@/components/client-wallet";
import { getClientContext } from "@/lib/data/client-context";
import { formatDate } from "@/lib/utils";
import {
  WORK_ITEM_STATUS_LABEL,
  computeWorkProgress,
  workItemStatusColor,
  type BudgetItem,
  type WorkItem,
} from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, project } = await getClientContext();

  const [{ data: workItems }, { data: budgetItems }] = await Promise.all([
    supabase.from("work_items").select("*").eq("project_id", project.id).order("start_date"),
    supabase.from("budget_items").select("*").eq("project_id", project.id).order("created_at"),
  ]);
  const wallet = (budgetItems ?? []) as BudgetItem[];

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

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel={`dashboard-${project.id}`}
        subscriptions={[
          { table: "projects", filter: `id=eq.${project.id}` },
          { table: "work_items", filter: `project_id=eq.${project.id}` },
          { table: "budget_items", filter: `project_id=eq.${project.id}` },
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
          <GanttPopup rows={ganttRows} emptyMessage="Nessuna lavorazione pianificata ancora." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portafoglio cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientWallet items={wallet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico pagamenti</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsHistory items={wallet} emptyLabel="Nessun pagamento registrato ancora." />
        </CardContent>
      </Card>
    </div>
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
