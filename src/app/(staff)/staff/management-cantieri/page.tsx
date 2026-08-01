import Link from "next/link";
import { Eye, GanttChartSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrafficLight } from "@/components/traffic-light";
import { getStaffContext } from "@/lib/data/staff-context";
import { formatDate } from "@/lib/utils";
import type { Profile, Project, StatusLight, WorkItem } from "@/lib/types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string) {
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86_400_000);
}

interface Row {
  item: WorkItem;
  project: Project;
  clientName?: string;
}

export default async function ManagementCantieriPage() {
  const { supabase } = await getStaffContext();

  const { data: projects } = await supabase.from("projects").select("*").eq("is_archived", false);
  const projectList = (projects ?? []) as Project[];
  const projectIds = projectList.map((p) => p.id);
  const projectById = new Map(projectList.map((p) => [p.id, p]));

  if (projectIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Management Cantieri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nessun cantiere attivo al momento.</p>
        </CardContent>
      </Card>
    );
  }

  const [{ data: workItemsData }, { data: clientsData }] = await Promise.all([
    supabase.from("work_items").select("*").in("project_id", projectIds).neq("status", "done"),
    supabase.from("profiles").select("*").eq("role", "client").in("project_id", projectIds),
  ]);

  const clientNameByProjectId = new Map(
    ((clientsData ?? []) as Profile[]).filter((c) => c.project_id).map((c) => [c.project_id as string, c.display_name]),
  );

  const rows: Row[] = ((workItemsData ?? []) as WorkItem[])
    .map((item): Row | null => {
      const project = projectById.get(item.project_id);
      if (!project) return null;
      return { item, project, clientName: clientNameByProjectId.get(item.project_id) };
    })
    .filter((r): r is Row => r !== null);

  const upcoming = rows.filter((r) => r.item.status === "planned" && daysUntil(r.item.start_date) >= 0);
  const overdueToStart = rows.filter((r) => r.item.status === "planned" && daysUntil(r.item.start_date) < 0);
  const inManagement = rows.filter((r) => r.item.status === "in_progress" || r.item.status === "postponed");
  const cancelled = rows.filter((r) => r.item.status === "cancelled");

  upcoming.sort((a, b) => a.item.start_date.localeCompare(b.item.start_date));
  overdueToStart.sort((a, b) => a.item.start_date.localeCompare(b.item.start_date));
  inManagement.sort((a, b) => (a.item.end_date ?? a.item.start_date).localeCompare(b.item.end_date ?? b.item.start_date));
  cancelled.sort((a, b) => a.item.start_date.localeCompare(b.item.start_date));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Scadenze di tutte le lavorazioni previste sui cantieri attivi, generata in automatico dalle date e dallo
          stato impostati in ogni cantiere.
        </p>
        <Link href="/staff/management-cantieri/gantt">
          <Button variant="outline" size="sm">
            <GanttChartSquare className="h-4 w-4" /> Gantt
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scadenza inizio lavori</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna lavorazione in attesa di iniziare.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {upcoming.map((r) => {
                const d = daysUntil(r.item.start_date);
                const color: StatusLight = d <= 7 ? "orange" : "green";
                return (
                  <RowItem key={r.item.id} row={r} indicator={<TrafficLight active={color} />} />
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lavori da gestire</CardTitle>
        </CardHeader>
        <CardContent>
          {overdueToStart.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna lavorazione oltre la data di inizio senza essere stata avviata.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {overdueToStart.map((r) => (
                <RowItem
                  key={r.item.id}
                  row={r}
                  indicator={
                    <div className="flex items-center gap-2">
                      <TrafficLight active="red" />
                      <span className="text-sm font-semibold text-status-red">
                        +{Math.abs(daysUntil(r.item.start_date))}gg
                      </span>
                    </div>
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lavori in gestione</CardTitle>
        </CardHeader>
        <CardContent>
          {inManagement.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna lavorazione in corso o posticipata al momento.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {inManagement.map((r) => {
                const deadline = r.item.end_date ?? r.item.start_date;
                const d = daysUntil(deadline);
                return (
                  <RowItem
                    key={r.item.id}
                    row={r}
                    indicator={
                      <span className={`text-sm font-medium ${d < 0 ? "text-status-red" : "text-muted-foreground"}`}>
                        {d < 0 ? `Scaduta da ${Math.abs(d)}gg` : `${d}gg alla scadenza`}
                      </span>
                    }
                  />
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cancellati</CardTitle>
        </CardHeader>
        <CardContent>
          {cancelled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna lavorazione cancellata.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {cancelled.map((r) => (
                <RowItem key={r.item.id} row={r} indicator={<Badge variant="red">CANCELLATO</Badge>} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RowItem({ row, indicator }: { row: Row; indicator: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{row.item.title}</p>
        <p className="text-xs text-muted-foreground">
          {row.project.client_label}
          {" · "}
          {row.clientName ?? <span className="italic">Cliente da aggiungere</span>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(row.item.start_date)}
          {row.item.end_date && ` – ${formatDate(row.item.end_date)}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {indicator}
        <Link
          href={`/staff/${row.project.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Apri il cantiere ${row.project.client_label}`}
        >
          <Eye className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}
