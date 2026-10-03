import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStaffContext } from "@/lib/data/staff-context";
import { GanttChart, type GanttRow } from "@/components/gantt-chart";
import { LiveRefresh } from "@/components/live-refresh";
import type { Profile, Project, WorkItem } from "@/lib/types";

export default async function GanttPage() {
  const { supabase } = await getStaffContext();

  const { data: projects } = await supabase.from("projects").select("*").eq("is_archived", false);
  const projectList = (projects ?? []) as Project[];
  const projectIds = projectList.map((p) => p.id);
  const projectById = new Map(projectList.map((p) => [p.id, p]));

  const [{ data: workItemsData }, { data: clientsData }] = await Promise.all([
    projectIds.length > 0
      ? supabase.from("work_items").select("*").in("project_id", projectIds).neq("status", "cancelled")
      : Promise.resolve({ data: [] as WorkItem[] }),
    supabase.from("profiles").select("*").eq("role", "client"),
  ]);

  // Il cliente di ogni cantiere (projects.client_id).
  const clientNameById = new Map(((clientsData ?? []) as Profile[]).map((c) => [c.id, c.display_name]));
  const clientNameByProjectId = new Map<string, string>();
  for (const p of projectList) {
    const name = p.client_id ? clientNameById.get(p.client_id) : undefined;
    if (name) clientNameByProjectId.set(p.id, name);
  }

  const rows: GanttRow[] = ((workItemsData ?? []) as WorkItem[])
    .map((item) => {
      const project = projectById.get(item.project_id);
      if (!project) return null;
      const row: GanttRow = {
        id: item.id,
        title: item.title,
        subtitle: `${project.client_label} · ${clientNameByProjectId.get(item.project_id) ?? "—"}`,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status,
        color: project.color,
        href: `/staff/${project.id}`,
      };
      return row;
    })
    .filter((r): r is GanttRow => r !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh
        channel="management-cantieri-gantt"
        subscriptions={[{ table: "work_items" }, { table: "projects" }]}
      />
      <Link
        href="/staff/management-cantieri"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Management Cantieri
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Gantt lavorazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <GanttChart rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
