import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStaffContext } from "@/lib/data/staff-context";
import { cn } from "@/lib/utils";
import { workItemStatusColor, type Profile, type Project, type WorkItem } from "@/lib/types";

const BAR_COLOR: Record<"default" | "green" | "orange" | "red", string> = {
  default: "bg-border",
  green: "bg-status-green",
  orange: "bg-status-orange",
  red: "bg-status-red",
};

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const DAY_WIDTH = 36; // px
const LABEL_WIDTH = 208; // px, colonna lavorazione fissa a sinistra
const MIN_SPAN_DAYS = 42; // scorrimento su almeno un mese e mezzo, anche a vuoto

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

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
    projectIds.length > 0
      ? supabase.from("profiles").select("*").eq("role", "client").in("project_id", projectIds)
      : Promise.resolve({ data: [] as Profile[] }),
  ]);

  const clientNameByProjectId = new Map(
    ((clientsData ?? []) as Profile[]).filter((c) => c.project_id).map((c) => [c.project_id as string, c.display_name]),
  );

  const items = ((workItemsData ?? []) as WorkItem[])
    .map((item) => ({ item, project: projectById.get(item.project_id) }))
    .filter((r): r is { item: WorkItem; project: Project } => !!r.project)
    .sort((a, b) => a.item.start_date.localeCompare(b.item.start_date));

  return (
    <div className="flex flex-col gap-6">
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
          <GanttChart items={items} clientNameByProjectId={clientNameByProjectId} />
        </CardContent>
      </Card>
    </div>
  );
}

function GanttChart({
  items,
  clientNameByProjectId,
}: {
  items: { item: WorkItem; project: Project }[];
  clientNameByProjectId: Map<string, string>;
}) {
  const today = startOfDay(new Date());

  let rangeStart: Date;
  let rangeEnd: Date;
  if (items.length === 0) {
    rangeStart = addDays(today, -7);
    rangeEnd = addDays(today, MIN_SPAN_DAYS - 7);
  } else {
    const starts = items.map((r) => startOfDay(new Date(`${r.item.start_date}T00:00:00`)).getTime());
    const ends = items.map((r) => startOfDay(new Date(`${r.item.end_date ?? r.item.start_date}T00:00:00`)).getTime());
    rangeStart = addDays(new Date(Math.min(...starts, today.getTime())), -3);
    rangeEnd = addDays(new Date(Math.max(...ends, today.getTime())), 3);
  }

  const totalDays = Math.max(MIN_SPAN_DAYS, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1);
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  const trackWidth = totalDays * DAY_WIDTH;
  const todayOffset = Math.round((today.getTime() - rangeStart.getTime()) / 86_400_000);
  const todayInRange = todayOffset >= 0 && todayOffset < totalDays;

  // Raggruppa i giorni per mese, per l'etichetta in alto e la riga di
  // separazione tra un mese e l'altro.
  const monthGroups: { label: string; days: number }[] = [];
  days.forEach((d) => {
    const label = monthLabel(d);
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) last.days += 1;
    else monthGroups.push({ label, days: 1 });
  });

  function dayOffset(dateStr: string) {
    const t = startOfDay(new Date(`${dateStr}T00:00:00`)).getTime();
    return Math.round((t - rangeStart.getTime()) / 86_400_000);
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <div style={{ width: LABEL_WIDTH + trackWidth }}>
        {/* Etichette dei mesi, con riga scura di separazione */}
        <div className="flex border-b border-border">
          <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-muted" style={{ width: LABEL_WIDTH }} />
          {monthGroups.map((g, i) => (
            <div
              key={i}
              className={cn(
                "shrink-0 truncate bg-muted px-2 py-1 text-xs font-semibold text-foreground",
                i > 0 && "border-l-2 border-foreground/50",
              )}
              style={{ width: g.days * DAY_WIDTH }}
            >
              {g.label}
            </div>
          ))}
        </div>

        {/* Intestazione: giorno della settimana + numero, weekend e oggi evidenziati */}
        <div className="flex border-b border-border bg-muted">
          <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-muted" style={{ width: LABEL_WIDTH }} />
          {days.map((d, i) => {
            const isToday = i === todayOffset;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isMonthStart = d.getDate() === 1 && i > 0;
            return (
              <div
                key={i}
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center border-r border-border/60 py-1 text-[10px]",
                  isMonthStart && "border-l-2 border-foreground/50",
                  isToday
                    ? "bg-brand-red/10 font-bold text-brand-red"
                    : isWeekend
                      ? "bg-muted-foreground/5 text-muted-foreground"
                      : "text-muted-foreground",
                )}
                style={{ width: DAY_WIDTH }}
              >
                <span>{WEEKDAY_LABEL[d.getDay()]}</span>
                <span className="font-semibold text-foreground">{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nessuna lavorazione da mostrare in questo periodo.</p>
        ) : (
          items.map(({ item, project }) => {
            const left = dayOffset(item.start_date) * DAY_WIDTH;
            const durationDays = dayOffset(item.end_date ?? item.start_date) - dayOffset(item.start_date) + 1;
            const width = Math.max(durationDays * DAY_WIDTH - 4, DAY_WIDTH - 4);
            const isDone = item.status === "done";
            return (
              <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                <div
                  className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-border bg-card px-2 py-2"
                  style={{ width: LABEL_WIDTH }}
                >
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="truncate text-muted-foreground">
                      {project.client_label} · {clientNameByProjectId.get(item.project_id) ?? "—"}
                    </p>
                  </div>
                  <Link
                    href={`/staff/${project.id}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Apri il cantiere ${project.client_label}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="relative h-9 shrink-0" style={{ width: trackWidth }}>
                  {/* Righe scure ai confini tra un mese e l'altro */}
                  {days.map((d, i) =>
                    d.getDate() === 1 && i > 0 ? (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l-2 border-foreground/20"
                        style={{ left: i * DAY_WIDTH }}
                      />
                    ) : null,
                  )}
                  {todayInRange && (
                    <div
                      className="absolute top-0 z-10 h-full border-l-2 border-dashed border-brand-red"
                      style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                    />
                  )}
                  <div
                    className={cn(
                      "absolute top-2 h-5 rounded-full",
                      isDone ? "bg-status-green/60" : BAR_COLOR[workItemStatusColor(item.status)],
                    )}
                    style={{ left: left + 2, width }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
