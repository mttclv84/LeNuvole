import { TIME_AREAS, type ProjectTiming, type TimeArea, type TimeEntry } from "@/lib/types";

// Da quale percentuale di ore usate parte l'avviso visivo "ti stai avvicinando".
export const TIME_WARNING_THRESHOLD = 0.8;

// Il menu delle ore previste (sezione Timing) propone da 0 a 100.
export const TIMING_MAX_HOURS = 100;

export function estimatedHours(timing: Pick<ProjectTiming, "est_design_h" | "est_quoting_h" | "est_site_h"> | null, area: TimeArea): number {
  if (!timing) return 0;
  if (area === "design") return timing.est_design_h;
  if (area === "quoting") return timing.est_quoting_h;
  return timing.est_site_h;
}

// Data di oggi nel fuso dello studio (YYYY-MM-DD), non quello del server.
export function todayInRome(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
}

// 95 -> "1h 35m", 120 -> "2h", 40 -> "40m", 0 -> "0m"
export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

// Durata del timer in corso: 01:42:35
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export type UsageLevel = "none" | "ok" | "warning" | "over";

export interface AreaSummary {
  plannedMinutes: number;
  usedMinutes: number;
  // previste - utilizzate: negativo se si sfora.
  remainingMinutes: number;
  // null se non sono previste ore.
  percent: number | null;
  level: UsageLevel;
}

function levelFor(planned: number, used: number): UsageLevel {
  if (planned <= 0) return used > 0 ? "over" : "none";
  const ratio = used / planned;
  if (ratio > 1) return "over";
  if (ratio >= TIME_WARNING_THRESHOLD) return "warning";
  return "ok";
}

export function buildSummary(plannedMinutes: number, usedMinutes: number): AreaSummary {
  return {
    plannedMinutes,
    usedMinutes,
    remainingMinutes: plannedMinutes - usedMinutes,
    percent: plannedMinutes > 0 ? Math.round((usedMinutes / plannedMinutes) * 100) : null,
    level: levelFor(plannedMinutes, usedMinutes),
  };
}

// Minuti per area. Conta solo le voci chiuse: un timer in corso non ha minuti definitivi.
export type AreaMinutes = Record<TimeArea, number>;

export function emptyAreaMinutes(): AreaMinutes {
  return { design: 0, quoting: 0, site: 0 };
}

export function sumByArea(entries: Pick<TimeEntry, "area" | "minutes">[]): AreaMinutes {
  const totals = emptyAreaMinutes();
  for (const e of entries) {
    if (e.minutes !== null) totals[e.area] += e.minutes;
  }
  return totals;
}

export function totalOf(minutes: AreaMinutes): number {
  return TIME_AREAS.reduce((sum, a) => sum + minutes[a], 0);
}

// Previste/utilizzate per area e totale di un cantiere.
export function summarizeProject(
  timing: Pick<ProjectTiming, "est_design_h" | "est_quoting_h" | "est_site_h"> | null,
  used: AreaMinutes,
): { areas: Record<TimeArea, AreaSummary>; total: AreaSummary } {
  const areas = Object.fromEntries(
    TIME_AREAS.map((a) => [a, buildSummary(estimatedHours(timing, a) * 60, used[a])]),
  ) as Record<TimeArea, AreaSummary>;
  const planned = TIME_AREAS.reduce((sum, a) => sum + areas[a].plannedMinutes, 0);
  return { areas, total: buildSummary(planned, totalOf(used)) };
}

// Etichetta dell'avviso: "90% utilizzato" / "+4h".
export function usageLabel(summary: AreaSummary): string | null {
  if (summary.level === "over") {
    if (summary.plannedMinutes <= 0) return "Ore non previste";
    return `+${formatMinutes(-summary.remainingMinutes)}`;
  }
  if (summary.level === "warning" && summary.percent !== null) return `${summary.percent}% utilizzato`;
  return null;
}
