import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusLightCard } from "@/components/status-light";
import { ProjectTimeline } from "@/components/project-timeline";
import { BudgetSummary } from "@/components/budget-summary";
import { getClientContext } from "@/lib/data/client-context";
import { formatDate } from "@/lib/utils";
import type { BudgetItem, TimelineStep, WorkItem } from "@/lib/types";

const WORK_STATUS_LABEL: Record<WorkItem["status"], string> = {
  planned: "In programma",
  in_progress: "In corso",
  done: "Completata",
};
const WORK_STATUS_VARIANT: Record<WorkItem["status"], "default" | "accent" | "green"> = {
  planned: "default",
  in_progress: "accent",
  done: "green",
};

export default async function DashboardPage() {
  const { supabase, project } = await getClientContext();

  const [{ data: workItems }, { data: timelineSteps }, { data: budgetItems }] = await Promise.all([
    supabase
      .from("work_items")
      .select("*")
      .eq("project_id", project.id)
      .order("week_start_date", { ascending: false })
      .limit(8),
    supabase.from("timeline_steps").select("*").eq("project_id", project.id).order("order_index"),
    supabase.from("budget_items").select("*").eq("project_id", project.id).order("created_at"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <StatusLightCard status={project.status_light} reason={project.status_reason} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lavorazioni della settimana</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkItemsList items={(workItems ?? []) as WorkItem[]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avanzamento del cantiere</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectTimeline steps={(timelineSteps ?? []) as TimelineStep[]} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Differenze budget</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetSummary items={(budgetItems ?? []) as BudgetItem[]} />
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
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              Settimana del {formatDate(item.week_start_date)}
            </p>
          </div>
          <Badge variant={WORK_STATUS_VARIANT[item.status]}>{WORK_STATUS_LABEL[item.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}
