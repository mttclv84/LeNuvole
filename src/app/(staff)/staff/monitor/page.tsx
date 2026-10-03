import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveRefresh } from "@/components/live-refresh";
import { SimpleTabs } from "@/components/simple-tabs";
import { getStaffContext } from "@/lib/data/staff-context";
import {
  getClosedEntriesForTotals,
  getEntriesPage,
  getProjectsAndClients,
  getTimePeople,
  getTimings,
} from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import {
  emptyAreaMinutes,
  formatMinutes,
  sumByArea,
  summarizeProject,
  totalOf,
  type AreaMinutes,
} from "@/lib/time-tracking";
import { formatDateTime } from "@/lib/utils";
import { TIME_AREAS, TIME_AREA_LABEL, type TimeEntry } from "@/lib/types";
import { deleteTimeEntry } from "../tempi/actions";
import { UsageBadge } from "../tempi/usage";
import { AreaBreakdown, AreaLegend, AreaSwatch, StackedBar } from "./charts";

const PAGE_SIZE = 10;

type Group = { key: string; name: string; sub?: string; minutes: AreaMinutes; badge?: React.ReactNode };

export default async function MonitorPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina } = await searchParams;
  const { supabase, profile } = await getStaffContext();

  const requestedPage = Math.max(1, Math.floor(Number(pagina) || 1));

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

  // ---- Totali globali e raggruppamenti -------------------------------------
  const global = sumByArea(closed);
  const globalTotal = totalOf(global);

  const byProject = new Map<string, AreaMinutes>();
  const byPerson = new Map<string, AreaMinutes>();
  const byClient = new Map<string, AreaMinutes>();
  const add = (map: Map<string, AreaMinutes>, key: string, e: (typeof closed)[number]) => {
    const m = map.get(key) ?? emptyAreaMinutes();
    m[e.area] += e.minutes ?? 0;
    map.set(key, m);
  };
  for (const e of closed) {
    add(byProject, e.project_id, e);
    add(byPerson, e.person_id, e);
    add(byClient, projectById.get(e.project_id)?.client_id ?? "none", e);
  }

  const sortGroups = (groups: Group[]) => groups.sort((a, b) => totalOf(b.minutes) - totalOf(a.minutes));

  const clientGroups = sortGroups(
    [...byClient].map(([id, minutes]) => ({
      key: id,
      name: id === "none" ? "Senza cliente" : (clientName.get(id) ?? "—"),
      sub: `${projects.filter((p) => p.client_id === id).length} cantieri`,
      minutes,
    })),
  );

  const projectGroups = sortGroups(
    [...byProject].map(([id, minutes]) => {
      const project = projectById.get(id);
      const summary = summarizeProject(timingByProject.get(id) ?? null, minutes);
      return {
        key: id,
        name: project?.client_label ?? "—",
        sub: [
          (project?.client_id && clientName.get(project.client_id)) || "Senza cliente",
          timingByProject.has(id) ? `previste ${formatMinutes(summary.total.plannedMinutes)}` : "ore previste non inserite",
        ].join(" · "),
        minutes,
        badge: <UsageBadge summary={summary.total} />,
      };
    }),
  );

  const personGroups = sortGroups(
    [...byPerson].map(([id, minutes]) => ({ key: id, name: personName.get(id) ?? "—", minutes })),
  );

  const canCorrectOthers = permissions.correctOthersTime(profile.role);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <LiveRefresh
        channel="staff-monitor"
        subscriptions={[{ table: "time_entries" }, { table: "project_timing" }, { table: "time_people" }]}
      />

      {/* Colpo d'occhio: ore di attività globali divise nelle tre aree */}
      <Card>
        <CardHeader>
          <CardTitle>Ore di attività totali</CardTitle>
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
              <p className="text-xs text-muted-foreground">{closed.length} registrazioni</p>
            </div>
          </div>
          <StackedBar minutes={global} scaleMax={globalTotal} className="h-6" />
          <AreaLegend />
        </CardContent>
      </Card>

      {/* Approfondimento: per cliente, per cantiere, per persona */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleTabs
            tabs={[
              { key: "cliente", label: "Per cliente", content: <GroupList groups={clientGroups} /> },
              { key: "cantiere", label: "Per cantiere", content: <GroupList groups={projectGroups} /> },
              { key: "persona", label: "Per persona", content: <GroupList groups={personGroups} /> },
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
              <PageLink page={page - 1} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" /> Più recenti
              </PageLink>
              <span className="text-muted-foreground tabular-nums">
                Pagina {page} di {pageCount}
              </span>
              <PageLink page={page + 1} disabled={page >= pageCount}>
                Meno recenti <ChevronRight className="h-4 w-4" />
              </PageLink>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  const className = "inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5";
  if (disabled) return <span className={`${className} text-muted-foreground opacity-50`}>{children}</span>;
  return (
    <Link href={`/staff/monitor?pagina=${page}`} scroll={false} className={`${className} hover:bg-muted`}>
      {children}
    </Link>
  );
}

// Righe sulla stessa scala: la più lunga occupa tutta la larghezza.
function GroupList({ groups }: { groups: Group[] }) {
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">Ancora nessun tempo registrato.</p>;
  const scaleMax = Math.max(...groups.map((g) => totalOf(g.minutes)));
  return (
    <div className="flex flex-col gap-4">
      <AreaLegend />
      <ul className="flex flex-col divide-y divide-border">
        {groups.map((g) => (
          <li key={g.key} className="flex flex-col gap-1.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{g.name}</p>
                {g.sub && <p className="truncate text-xs text-muted-foreground">{g.sub}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {g.badge}
                <span className="text-lg font-semibold tabular-nums">{formatMinutes(totalOf(g.minutes))}</span>
              </div>
            </div>
            <StackedBar minutes={g.minutes} scaleMax={scaleMax} />
            <AreaBreakdown minutes={g.minutes} />
          </li>
        ))}
      </ul>
    </div>
  );
}
