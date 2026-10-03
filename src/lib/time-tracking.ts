import {
  TIME_AREAS,
  type TimeArea,
  type TimeEntry,
  type TimeJob,
} from "@/lib/types";

// Da quale percentuale di ore usate parte l'avviso visivo "ti stai avvicinando".
export const TIME_WARNING_THRESHOLD = 0.8;

export function estimatedHours(job: TimeJob, area: TimeArea): number {
  if (area === "design") return Number(job.est_design_h);
  if (area === "quoting") return Number(job.est_quoting_h);
  return Number(job.est_site_h);
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

// Accetta "30", "7,5", "7.5" -> 7.5. Valori non validi o negativi -> null.
export function parseHours(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") return 0;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 9999) return null;
  return Math.round(value * 100) / 100;
}

export type UsageLevel = "none" | "ok" | "warning" | "over";

export interface AreaSummary {
  area: TimeArea;
  plannedMinutes: number;
  usedMinutes: number;
  // previste - utilizzate: negativo se si sfora.
  remainingMinutes: number;
  // null se per l'area non sono previste ore.
  percent: number | null;
  level: UsageLevel;
}

export interface PersonSummary {
  personId: string;
  minutes: number;
}

export interface JobSummary {
  areas: AreaSummary[];
  total: AreaSummary;
  perPerson: PersonSummary[];
}

function levelFor(planned: number, used: number): UsageLevel {
  if (planned <= 0) return used > 0 ? "over" : "none";
  const ratio = used / planned;
  if (ratio > 1) return "over";
  if (ratio >= TIME_WARNING_THRESHOLD) return "warning";
  return "ok";
}

function buildSummary(area: TimeArea | "total", plannedMinutes: number, usedMinutes: number): AreaSummary {
  return {
    area: area as TimeArea,
    plannedMinutes,
    usedMinutes,
    remainingMinutes: plannedMinutes - usedMinutes,
    percent: plannedMinutes > 0 ? Math.round((usedMinutes / plannedMinutes) * 100) : null,
    level: levelFor(plannedMinutes, usedMinutes),
  };
}

// Conta solo le voci chiuse: un timer ancora in corso non ha minuti definitivi.
export function summarizeJob(job: TimeJob, entries: Pick<TimeEntry, "area" | "person_id" | "minutes">[]): JobSummary {
  const usedByArea = new Map<TimeArea, number>(TIME_AREAS.map((a) => [a, 0]));
  const usedByPerson = new Map<string, number>();

  for (const entry of entries) {
    if (entry.minutes === null) continue;
    usedByArea.set(entry.area, (usedByArea.get(entry.area) ?? 0) + entry.minutes);
    usedByPerson.set(entry.person_id, (usedByPerson.get(entry.person_id) ?? 0) + entry.minutes);
  }

  const areas = TIME_AREAS.map((area) =>
    buildSummary(area, Math.round(estimatedHours(job, area) * 60), usedByArea.get(area) ?? 0),
  );
  const totalPlanned = areas.reduce((sum, a) => sum + a.plannedMinutes, 0);
  const totalUsed = areas.reduce((sum, a) => sum + a.usedMinutes, 0);

  const perPerson = [...usedByPerson.entries()]
    .map(([personId, minutes]) => ({ personId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  return { areas, total: buildSummary("total", totalPlanned, totalUsed), perPerson };
}

// Etichetta dell'avviso, come da specifica: "90% utilizzato" / "+4h".
export function usageLabel(summary: AreaSummary): string | null {
  if (summary.level === "over") {
    if (summary.plannedMinutes <= 0) return "Ore non previste";
    return `+${formatMinutes(-summary.remainingMinutes)}`;
  }
  if (summary.level === "warning" && summary.percent !== null) return `${summary.percent}% utilizzato`;
  return null;
}
