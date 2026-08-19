import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { workItemStatusColor, type WorkItemStatus } from "@/lib/types";

const BAR_COLOR: Record<"default" | "green" | "orange" | "red", string> = {
  default: "bg-border",
  green: "bg-status-green",
  orange: "bg-status-orange",
  red: "bg-status-red",
};

const WEEKDAY_LABEL = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const DAY_WIDTH = 36; // px
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

// Riga generica del Gantt: usata sia dal Gantt multi-cantiere dello staff
// (subtitle = cliente, color = colore assegnato al cantiere, href = link
// alla scheda) sia dalla versione semplificata mostrata al cliente nella
// propria dashboard (senza subtitle/color/href).
export type GanttRow = {
  id: string;
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string | null;
  status: WorkItemStatus;
  color?: string | null;
  href?: string;
};

export function GanttChart({
  rows,
  labelWidth = 208,
  emptyMessage = "Nessuna lavorazione da mostrare in questo periodo.",
}: {
  rows: GanttRow[];
  labelWidth?: number;
  emptyMessage?: string;
}) {
  const today = startOfDay(new Date());

  let rangeStart: Date;
  let rangeEnd: Date;
  if (rows.length === 0) {
    rangeStart = addDays(today, -7);
    rangeEnd = addDays(today, MIN_SPAN_DAYS - 7);
  } else {
    const starts = rows.map((r) => startOfDay(new Date(`${r.startDate}T00:00:00`)).getTime());
    const ends = rows.map((r) => startOfDay(new Date(`${r.endDate ?? r.startDate}T00:00:00`)).getTime());
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
      <div style={{ width: labelWidth + trackWidth }}>
        {/* Etichette dei mesi, con riga scura di separazione */}
        <div className="flex border-b border-border">
          <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-muted" style={{ width: labelWidth }} />
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
          <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-muted" style={{ width: labelWidth }} />
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

        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          rows.map((row) => {
            const left = dayOffset(row.startDate) * DAY_WIDTH;
            const durationDays = dayOffset(row.endDate ?? row.startDate) - dayOffset(row.startDate) + 1;
            const width = Math.max(durationDays * DAY_WIDTH - 4, DAY_WIDTH - 4);
            const isDone = row.status === "done";
            return (
              <div key={row.id} className="flex items-center border-b border-border last:border-b-0">
                <div
                  className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-border bg-card px-2 py-2"
                  style={{
                    width: labelWidth,
                    borderLeft: row.color ? `4px solid ${row.color}` : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-medium">{row.title}</p>
                    {row.subtitle && <p className="truncate text-muted-foreground">{row.subtitle}</p>}
                  </div>
                  {row.href && (
                    <Link
                      href={row.href}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Apri ${row.title}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  )}
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
                      isDone ? "bg-status-green/60" : BAR_COLOR[workItemStatusColor(row.status)],
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
