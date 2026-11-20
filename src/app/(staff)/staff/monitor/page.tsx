import Link from "next/link";
import { ChevronLeft, ChevronRight, Fuel, OctagonAlert, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveRefresh } from "@/components/live-refresh";
import { SimpleTabs } from "@/components/simple-tabs";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { FuelGauge } from "@/components/fuel-gauge";
import { getStaffContext } from "@/lib/data/staff-context";
import {
  closeStaleTimers,
  getClosedEntriesForTotals,
  getEntriesPage,
  getProjectsAndClients,
  getTimePeople,
  getTimings,
} from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import {
  buildSummary,
  emptyAreaMinutes,
  formatMinutes,
  sumByArea,
  summarizeProject,
  totalOf,
  type AreaMinutes,
  type AreaSummary,
} from "@/lib/time-tracking";
import { cn, formatDateTime } from "@/lib/utils";
import { TIME_AREAS, TIME_AREA_LABEL, type TimeArea, type TimeEntry } from "@/lib/types";
import { deleteTimeEntry } from "../tempi/actions";
import { AreaBreakdown, AreaLegend, AreaSwatch, StackedBar } from "./charts";

const PAGE_SIZE = 10;

// "YYYY-MM" del giorno in cui è iniziata la voce, nel fuso dello studio.
function monthKey(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(iso)).slice(0, 7);
}

function monthLabel(key: string) {
  const label = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${key}-15T12:00:00Z`),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type ProjectCard = {
  id: string;
  name: string;
  clientLabel: string;
  hasTiming: boolean;
  areas: Record<TimeArea, AreaSummary>;
  total: AreaSummary;
};

// Gravità per ordinare: prima chi ha sforato, poi chi è in riserva.
function severity(s: AreaSummary) {
  return s.level === "over" ? 2 : s.level === "warning" ? 1 : 0;
}
function worst(card: Pick<ProjectCard, "areas" | "total">) {
  return Math.max(severity(card.total), ...TIME_AREAS.map((a) => severity(card.areas[a])));
}

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; mese?: string }>;
}) {
  const { pagina, mese } = await searchParams;
  const { supabase, profile } = await getStaffContext();

  const requestedPage = Math.max(1, Math.floor(Number(pagina) || 1));
  await closeStaleTimers(supabase);

  const [people, { projects, clients }, timings, closed, { entries, total: entryCount }] = await Promise.all([
    getTimePeople(supabase),
    getProjectsAndClients(supabase),
    getTimings(supabase),
    getClosedEntriesForTotals(supabase),
    getEntriesPage(supabase, requestedPage, PAGE_SIZE),
  ]);

  const pageCount = Math.max(1, Math.ceil(entryCount / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const personName = new Map(people.map((p) => [p.id, p.name]));
  const clientName = new Map(clients.map((c) => [c.id, c.display_name]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const timingByProject = new Map(timings.map((t) => [t.project_id, t]));

  // ---- Ore di attività totali, filtrabili per mese --------------------------
  const months = [...new Set(closed.map((e) => monthKey(e.started_at)))].sort().reverse();
  const selectedMonth = mese && months.includes(mese) ? mese : "";
  const inPeriod = selectedMonth ? closed.filter((e) => monthKey(e.started_at) === selectedMonth) : closed;
  const global = sumByArea(inPeriod);
  const globalTotal = totalOf(global);

  // ---- Raggruppamenti (sempre su tutto lo storico: si confrontano con le ore previste)
  const byProject = new Map<string, AreaMinutes>();
  const byPerson = new Map<string, AreaMinutes>();
  for (const e of closed) {
    for (const [map, key] of [
      [byProject, e.project_id],
      [byPerson, e.person_id],
    ] as const) {
      const m = map.get(key) ?? emptyAreaMinutes();
      m[e.area] += e.minutes ?? 0;
      map.set(key, m);
    }
  }

  // Cantieri: tutti quelli con ore previste o con tempo registrato.
  const projectCards: ProjectCard[] = projects
    .filter((p) => byProject.has(p.id) || (timingByProject.has(p.id) && !p.is_archived))
    .map((p) => {
      const summary = summarizeProject(timingByProject.get(p.id) ?? null, byProject.get(p.id) ?? emptyAreaMinutes());
      return {
        id: p.id,
        name: p.client_label,
        clientLabel: (p.client_id && clientName.get(p.client_id)) || "Senza cliente",
        hasTiming: timingByProject.has(p.id),
        ...summary,
      };
    })
    .sort((a, b) => worst(b) - worst(a) || b.total.usedMinutes - a.total.usedMinutes);

  // Clienti: somma delle ore previste e utilizzate di tutti i loro cantieri.
  const clientCards = [...new Set(projectCards.map((c) => projects.find((p) => p.id === c.id)?.client_id ?? "none"))]
    .map((clientId) => {
      const own = projectCards.filter((c) => (projects.find((p) => p.id === c.id)?.client_id ?? "none") === clientId);
      const planned = own.reduce((sum, c) => sum + c.total.plannedMinutes, 0);
      const used = own.reduce((sum, c) => sum + c.total.usedMinutes, 0);
      return {
        id: clientId,
        name: clientId === "none" ? "Senza cliente" : (clientName.get(clientId) ?? "—"),
        count: own.length,
        total: buildSummary(planned, used),
      };
    })
    .sort((a, b) => severity(b.total) - severity(a.total) || b.total.usedMinutes - a.total.usedMinutes);

  const personGroups = [...byPerson]
    .map(([id, minutes]) => ({ key: id, name: personName.get(id) ?? "—", minutes }))
    .sort((a, b) => totalOf(b.minutes) - totalOf(a.minutes));

  // Avvisi: cantieri attivi in riserva o con ore extra, in qualsiasi area.
  // Compaiono come icona nel riquadro del cantiere (dettaglio al passaggio del mouse).
  const alertIds = new Set(
    projectCards.filter((c) => worst(c) > 0 && !projectById.get(c.id)?.is_archived).map((c) => c.id),
  );

  const canCorrectOthers = permissions.correctOthersTime(profile.role);

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <LiveRefresh
        channel="staff-monitor"
        subscriptions={[{ table: "time_entries" }, { table: "project_timing" }, { table: "time_people" }]}
      />


      {/* Colpo d'occhio: ore di attività globali divise nelle tre aree */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Ore di attività totali</CardTitle>
          <form method="get" action="/staff/monitor" className="flex items-center gap-2">
            <label htmlFor="monitor_month" className="text-sm text-muted-foreground">
              Periodo
            </label>
            <AutoSubmitSelect
              key={selectedMonth}
              id="monitor_month"
              name="mese"
              defaultValue={selectedMonth}
              options={[{ value: "", label: "Tutti i mesi" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm"
            />
          </form>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIME_AREAS.map((a) => (
              <div key={a} className="rounded-md border border-border p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AreaSwatch area={a} /> {TIME_AREA_LABEL[a]}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{formatMinutes(global[a])}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {globalTotal > 0 ? `${Math.round((global[a] / globalTotal) * 100)}% del totale` : "—"}
                </p>
              </div>
            ))}
            <div className="rounded-md border border-border bg-muted p-4">
              <p className="text-sm text-muted-foreground">Totale</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{formatMinutes(globalTotal)}</p>
              <p className="text-xs text-muted-foreground">
                {inPeriod.length} registrazioni{selectedMonth && ` · ${monthLabel(selectedMonth).toLowerCase()}`}
              </p>
            </div>
          </div>
          <StackedBar minutes={global} scaleMax={globalTotal} className="h-6" />
          <AreaLegend />
        </CardContent>
      </Card>

      {/* Approfondimento: per cantiere, per cliente, per utenza */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio previsioni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Ogni indicatore è un serbatoio: pieno (F) = ore previste. Scende man mano che si registra tempo, entra in{" "}
            <strong className="text-status-orange">riserva</strong> nell&apos;ultimo 20% e oltre lo zero segnala le{" "}
            <strong className="text-status-red">ore extra</strong>. Sempre su tutto lo storico.
          </p>
          <SimpleTabs
            tabs={[
              { key: "cantiere", label: "Per cantiere", content: <ProjectGauges cards={projectCards} alertIds={alertIds} /> },
              { key: "cliente", label: "Per cliente", content: <ClientGauges cards={clientCards} /> },
              { key: "persona", label: "Per utenza", content: <PersonList groups={personGroups} /> },
            ]}
          />
        </CardContent>
      </Card>

      {/* Storico, 10 per pagina */}
      <Card>
        <CardHeader>
          <CardTitle>Storico registrazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ancora nessun tempo registrato.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {entries.map((e: TimeEntry) => {
                const project = projectById.get(e.project_id);
                const canDelete = e.minutes !== null && (e.recorded_by === profile.id || canCorrectOthers);
                return (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {personName.get(e.person_id) ?? "—"} ·{" "}
                        {(project?.client_id && clientName.get(project.client_id)) || "—"} — {project?.client_label ?? "—"}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                        <AreaSwatch area={e.area} className="h-2 w-2" />
                        {TIME_AREA_LABEL[e.area]} · {formatDateTime(e.started_at)}
                        {e.source === "manual" && " · inserito a mano"}
                        {e.note && ` · ${e.note}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {e.minutes === null ? (
                        <Badge variant="accent">in corso</Badge>
                      ) : (
                        <span className="text-sm font-semibold tabular-nums">{formatMinutes(e.minutes)}</span>
                      )}
                      {canDelete && (
                        <form action={deleteTimeEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <button
                            type="submit"
                            aria-label="Elimina questa voce"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-status-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pageCount > 1 && (
            <nav className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm" aria-label="Pagine storico">
              <PageLink page={page - 1} month={selectedMonth} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Più recenti
              </PageLink>
              <span className="text-muted-foreground tabular-nums">
                Pagina {page} di {pageCount}
              </span>
              <PageLink page={page + 1} month={selectedMonth} disabled={page >= pageCount}>
                Meno recenti <ChevronRight className="h-4 w-4" />
              </PageLink>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageLink({
  page,
  month,
  disabled,
  children,
}: {
  page: number;
  month: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className = "inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5";
  if (disabled) return <span className={`${className} text-muted-foreground opacity-50`}>{children}</span>;
  const query = new URLSearchParams({ pagina: String(page), ...(month && { mese: month }) });
  return (
    <Link href={`/staff/monitor?${query}`} scroll={false} className={`${className} hover:bg-muted`}>
      {children}
    </Link>
  );
}

// Cantieri in riserva o con ore extra, area per area.
// Icona di avviso in alto a destra nel riquadro del cantiere: rossa se c'è
// un extra, arancio se è solo in riserva. Il dettaglio compare passando sopra
// col mouse (o toccandola / con il tasto Tab, grazie a focus).
function AlertIcon({ card }: { card: ProjectCard }) {
  const issues = [...TIME_AREAS.map((a) => [TIME_AREA_LABEL[a], card.areas[a]] as const), ["Totale", card.total] as const].filter(
    ([, s]) => severity(s) > 0,
  );
  const isOver = issues.some(([, s]) => s.level === "over");
  return (
    <div className="group absolute right-3 top-3">
      <button
        type="button"
        aria-label={`Avvisi ore previste: ${issues.map(([label]) => label).join(", ")}`}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          isOver ? "bg-status-red/15 text-status-red" : "bg-status-orange/15 text-status-orange",
        )}
      >
        {isOver ? <OctagonAlert className="h-4.5 w-4.5" /> : <Fuel className="h-4.5 w-4.5" />}
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-9 z-20 w-64 rounded-md border border-border/70 bg-card p-3 opacity-0 shadow-elev-3 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <p className="mb-2 text-xs font-semibold">Avvisi ore previste</p>
        <ul className="flex flex-col gap-1.5">
          {issues.map(([label, s]) =>
            s.level === "over" ? (
              <li key={label}>
                <Badge variant="red" className="gap-1">
                  <OctagonAlert className="h-3 w-3" /> {label}: +{formatMinutes(-s.remainingMinutes)} extra
                </Badge>
              </li>
            ) : (
              <li key={label}>
                <Badge variant="orange" className="gap-1">
                  <Fuel className="h-3 w-3" /> {label}: riserva, {formatMinutes(s.remainingMinutes)} residue
                </Badge>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

function ProjectGauges({ cards, alertIds }: { cards: ProjectCard[]; alertIds: Set<string> }) {
  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun cantiere con ore previste o tempo registrato.</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((c) => (
        <div key={c.id} className="relative rounded-md border border-border p-4">
          {alertIds.has(c.id) && <AlertIcon card={c} />}
          <Link href={`/staff/${c.id}/timing`} className="block pr-10 hover:underline">
            <p className="font-semibold">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.clientLabel}</p>
          </Link>
          {c.hasTiming ? (
            <div className="mt-3 flex flex-col items-center gap-4">
              <FuelGauge summary={c.total} label="Totale" />
              <div className="grid w-full grid-cols-3 justify-items-center gap-2">
                {TIME_AREAS.map((a) => (
                  <FuelGauge key={a} summary={c.areas[a]} label={TIME_AREA_LABEL[a]} size="sm" />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Ore previste non ancora inserite ·{" "}
              <Link href={`/staff/${c.id}/timing`} className="text-accent hover:underline">
                inseriscile nel Timing
              </Link>
              <br />
              Registrate finora: {formatMinutes(c.total.usedMinutes)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ClientGauges({ cards }: { cards: { id: string; name: string; count: number; total: AreaSummary }[] }) {
  if (cards.length === 0) return <p className="text-sm text-muted-foreground">Ancora nessun dato.</p>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.id} className="flex flex-col items-center rounded-md border border-border p-4">
          <FuelGauge summary={c.total} label={c.name} />
          <p className="mt-1 text-xs text-muted-foreground">{c.count === 1 ? "1 cantiere" : `${c.count} cantieri`}</p>
        </div>
      ))}
    </div>
  );
}

// Le persone non hanno ore previste: barre sulla stessa scala.
function PersonList({ groups }: { groups: { key: string; name: string; minutes: AreaMinutes }[] }) {
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">Ancora nessun tempo registrato.</p>;
  const scaleMax = Math.max(...groups.map((g) => totalOf(g.minutes)));
  return (
    <div className="flex flex-col gap-4">
      <AreaLegend />
      <ul className="flex flex-col divide-y divide-border">
        {groups.map((g) => (
          <li key={g.key} className="flex flex-col gap-1.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="truncate font-semibold">{g.name}</p>
              <span className="text-lg font-semibold tabular-nums">{formatMinutes(totalOf(g.minutes))}</span>
            </div>
            <StackedBar minutes={g.minutes} scaleMax={scaleMax} />
            <AreaBreakdown minutes={g.minutes} />
          </li>
        ))}
      </ul>
    </div>
  );
}
