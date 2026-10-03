import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LiveRefresh } from "@/components/live-refresh";
import { getStaffContext } from "@/lib/data/staff-context";
import {
  getClosedEntriesForTotals,
  getLastEntryForPerson,
  getProjectsAndClients,
  getRememberedPersonId,
  getRunningEntries,
  getTimePeople,
  getTimings,
} from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import { emptyAreaMinutes, summarizeProject, todayInRome, type AreaMinutes } from "@/lib/time-tracking";
import { TIME_AREAS, type TimePerson } from "@/lib/types";
import { createTimePerson, setTimePersonActive } from "./actions";
import { TimeEntryForm, type ClientOption, type ProjectBudget } from "./time-entry-form";
import { RunningTimers, type RunningTimerView } from "./timer-card";

export default async function TempiPage() {
  const { supabase, profile } = await getStaffContext();

  // getRunningEntries chiude prima i timer oltre le 8 ore: va prima dei totali.
  const running = await getRunningEntries(supabase);
  const [people, { projects, clients }, rememberedId, timings, closed] = await Promise.all([
    getTimePeople(supabase),
    getProjectsAndClients(supabase),
    getRememberedPersonId(),
    getTimings(supabase),
    getClosedEntriesForTotals(supabase),
  ]);

  // Ore previste e usate per cantiere: servono all'avviso riserva / ore extra.
  const usedByProject = new Map<string, AreaMinutes>();
  for (const e of closed) {
    const m = usedByProject.get(e.project_id) ?? emptyAreaMinutes();
    m[e.area] += e.minutes ?? 0;
    usedByProject.set(e.project_id, m);
  }
  const timingByProject = new Map(timings.map((t) => [t.project_id, t]));
  const budget: ProjectBudget = Object.fromEntries(
    projects.map((p) => {
      const { areas } = summarizeProject(timingByProject.get(p.id) ?? null, usedByProject.get(p.id) ?? emptyAreaMinutes());
      return [
        p.id,
        {
          hasTiming: timingByProject.has(p.id),
          areas: Object.fromEntries(
            TIME_AREAS.map((a) => [a, { level: areas[a].level, remainingMinutes: areas[a].remainingMinutes }]),
          ) as ProjectBudget[string]["areas"],
        },
      ];
    }),
  );

  const activePeople = people.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }));
  const personName = new Map(people.map((p) => [p.id, p.name]));
  const clientName = new Map(clients.map((c) => [c.id, c.display_name]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  // Clienti attivi con almeno un cantiere attivo: le uniche scelte possibili.
  const clientOptions: ClientOption[] = clients
    .filter((c) => c.active)
    .map((c) => ({
      id: c.id,
      name: c.display_name,
      projects: projects
        .filter((p) => p.client_id === c.id && !p.is_archived)
        .map((p) => ({ id: p.id, label: p.client_label })),
    }))
    .filter((c) => c.projects.length > 0);

  // Persona ricordata su questo dispositivo; da lì cantiere e area dell'ultima voce,
  // così ripartire richiede un solo tocco.
  const defaultPersonId = activePeople.find((p) => p.id === rememberedId)?.id;
  const last = defaultPersonId ? await getLastEntryForPerson(supabase, defaultPersonId) : null;
  const lastProject = last ? projectById.get(last.project_id) : undefined;
  const lastStillSelectable = lastProject && clientOptions.some((c) => c.projects.some((p) => p.id === lastProject.id));
  const defaults = {
    personId: defaultPersonId,
    clientId: lastStillSelectable ? (lastProject.client_id ?? undefined) : undefined,
    projectId: lastStillSelectable ? lastProject.id : undefined,
    area: last?.area,
  };

  const runningViews: RunningTimerView[] = running.map((e) => {
    const project = projectById.get(e.project_id);
    return {
      entryId: e.id,
      personName: personName.get(e.person_id) ?? "—",
      clientName: (project?.client_id && clientName.get(project.client_id)) || "—",
      projectLabel: project?.client_label ?? "—",
      area: e.area,
      startedAt: e.started_at,
    };
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <LiveRefresh
        channel="staff-tempi"
        subscriptions={[{ table: "time_entries" }, { table: "time_people" }, { table: "projects" }, { table: "project_timing" }]}
      />

      <RunningTimers running={runningViews} />

      <TimeEntryForm
        people={activePeople}
        clients={clientOptions}
        defaults={defaults}
        today={todayInRome()}
        budget={budget}
      />

      <Link
        href="/staff/monitor"
        className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <BarChart3 className="h-4 w-4" /> Storico e riepiloghi nel Monitor
      </Link>

      {permissions.accessUsersPage(profile.role) && <PeopleManager people={people} />}
    </div>
  );
}

// Elenco delle persone tra cui si sceglie nel menu (Mattia, Federica, Lesly...).
// Lo gestisce solo il Super User. Chi non c'è più si disattiva: sparisce dai
// menu ma le sue ore passate restano nei totali.
function PeopleManager({ people }: { people: TimePerson[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Persone</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Le persone tra cui si sceglie nel menu quando si registra il tempo. Non sono account di accesso.
        </p>
        <ul className="mb-4 flex flex-col divide-y divide-border">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm font-medium">{p.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant={p.is_active ? "green" : "default"}>{p.is_active ? "Attiva" : "Disattivata"}</Badge>
                <form action={setTimePersonActive}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={(!p.is_active).toString()} />
                  <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                    {p.is_active ? "Disattiva" : "Riattiva"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <form action={createTimePerson} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="new_person_name">Aggiungi persona</Label>
            <Input id="new_person_name" name="name" placeholder="Nome" required />
          </div>
          <Button type="submit">Aggiungi</Button>
        </form>
      </CardContent>
    </Card>
  );
}
