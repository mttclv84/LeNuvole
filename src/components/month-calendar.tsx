"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { workItemStatusColor } from "@/lib/types";
import type { GanttRow } from "@/components/gantt-chart";

const WEEKDAY_LABEL = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const BAR_COLOR: Record<"default" | "green" | "orange" | "red", string> = {
  default: "bg-border text-foreground",
  green: "bg-status-green text-white",
  orange: "bg-status-orange text-white",
  red: "bg-status-red text-white",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthLabel(d: Date) {
  const label = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Vero calendario a mese (settimane in righe, una sotto l'altra) invece
// della timeline orizzontale del Gantt: su telefono è molto più leggibile,
// perché scorre in verticale invece che a scatti in orizzontale.
export function MonthCalendar({ rows, emptyMessage }: { rows: GanttRow[]; emptyMessage?: string }) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunedì = 0
  const gridStart = addDays(firstOfMonth, -startWeekday);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const days = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function itemsForDay(day: Date) {
    return rows.filter((r) => {
      const start = startOfDay(new Date(`${r.startDate}T00:00:00`));
      const end = startOfDay(new Date(`${r.endDate ?? r.startDate}T00:00:00`));
      return day >= start && day <= end;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">{monthLabel(cursor)}</p>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-center text-[11px] font-semibold text-muted-foreground">
        {WEEKDAY_LABEL.map((d) => (
          <div key={d} className="bg-muted py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-md border border-border bg-border">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = sameDay(day, today);
              const dayItems = itemsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn("flex min-h-20 flex-col gap-0.5 bg-card p-1", !inMonth && "bg-muted/40")}
                >
                  <span
                    className={cn(
                      "self-end text-[11px]",
                      isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-red font-bold text-white"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        title={item.title}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[9px] leading-tight",
                          BAR_COLOR[workItemStatusColor(item.status)],
                        )}
                      >
                        {item.title}
                      </span>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{dayItems.length - 2} altre</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {rows.length === 0 && emptyMessage && <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>}
    </div>
  );
}
