import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LiveRefresh } from "@/components/live-refresh";
import { SimpleTabs } from "@/components/simple-tabs";
import { getStaffContext } from "@/lib/data/staff-context";
import {
  getJobsOverview,
  getRecentEntriesForPerson,
  getRememberedPersonId,
  getRunningTimers,
  getTimePeople,
} from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import { formatMinutes, summarizeJob, todayInRome } from "@/lib/time-tracking";
import type { Project, TimeEntry, TimeJob, TimePerson } from "@/lib/types";
import { createTimePerson, setTimePersonActive } from "./actions";
import { ManualEntryButton, NewJobButton } from "./job-modals";
import { TimerCard, type RunningTimerView, type TimerJobOption } from "./timer-card";
import { UsageBadge, UsageBar } from "./usage";

type JobRow = { job: TimeJob; entries: Pick<TimeEntry, "area" | "person_id" | "minutes">[] };

export default async function TempiHomePage() {
  const { supabase, profile } = await getStaffContext();

  const people = await getTimePeople(supabase);
  const activePeople = people.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }));

  // La persona scelta l'ultima volta su questo dispositivo, se è ancora attiva.
  const rememberedId = await getRememberedPersonId();
  const defaultPersonId = activePeople.find((p) => p.id === rememberedId)?.id;

  const [running, overview, recentEntries, { data: projects }] = await Promise.all([
    getRunningTimers(supabase, people),
    getJobsOverview(supabase),
    defaultPersonId ? getRecentEntriesForPerson(supabase, defaultPersonId) : Promise.resolve([] as TimeEntry[]),
    supabase.from("projects").select("id, client_label").eq("is_archived", false).order("client_label"),
  ]);

  // Commesse su cui ha lavorato di recente la persona scelta in cima, le altre per data di creazione.
  const recentJobIds = [...new Set(recentEntries.map((e) => e.job_id))];
  const rank = new Map(recentJobIds.map((id, i) => [id, i]));
  const byRecency = (a: JobRow, b: JobRow) => (rank.get(a.job.id) ?? 9999) - (rank.get(b.job.id) ?? 9999);

  const open = overview.filter((o) => !o.job.is_closed).sort(byRecency);
  const closed = overview.filter((o) => o.job.is_closed);

  const jobOptions: TimerJobOption[] = open.map(({ job }) => ({ id: job.id, label: `${job.client_name} — ${job.title}` }));

  // Un solo tocco per ripartire: preseleziono l'ultima commessa (se ancora aperta) e l'ultima area usate.
  const lastEntry = recentEntries[0];
  const defaultJobId = lastEntry && open.some((o) => o.job.id === lastEntry.job_id) ? lastEntry.job_id : undefined;
  const defaultArea = lastEntry?.area;

  const runningViews: RunningTimerView[] = running.map((r) => ({
    entryId: r.entry.id,
    personName: r.person?.name ?? "—",
    jobLabel: `${r.job.client_name} — ${r.job.title}`,
    area: r.entry.area,
    startedAt: r.entry.started_at,
  }));

  const projectOptions = ((projects ?? []) as Pick<Project, "id" | "client_label">[]).map((p) => ({
    id: p.id,
    label: p.client_label,
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <LiveRefresh
        channel="staff-tempi"
        subscriptions={[{ table: "time_entries" }, { table: "time_jobs" }, { table: "time_people" }]}
      />

      <TimerCard
        running={runningViews}
        jobs={jobOptions}
        people={activePeople}
        defaultJobId={defaultJobId}
        defaultArea={defaultArea}
        defaultPersonId={defaultPersonId}
      />

      <div className="flex gap-3">
        <NewJobButton projects={projectOptions} />
        <ManualEntryButton
          jobs={jobOptions}
          people={activePeople}
          defaultJobId={defaultJobId}
          defaultArea={defaultArea}
          defaultPersonId={defaultPersonId}
          today={todayInRome()}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commesse recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleTabs
            tabs={[
              { key: "aperte", label: `Aperte (${open.length})`, content: <JobList rows={open} /> },
              { key: "chiuse", label: `Chiuse (${closed.length})`, content: <JobList rows={closed} /> },
            ]}
          />
        </CardContent>
      </Card>

      {permissions.accessUsersPage(profile.role) && <PeopleManager people={people} />}
    </div>
  );
}

function JobList({ rows }: { rows: JobRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna commessa qui.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map(({ job, entries }) => {
        const { total } = summarizeJob(job, entries);
        return (
          <li key={job.id}>
            <Link href={`/staff/tempi/${job.id}`} className="flex flex-col gap-2 py-3 hover:bg-muted/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{job.client_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{job.title}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm tabular-nums">
                    {formatMinutes(total.usedMinutes)}
                    <span className="text-muted-foreground"> / {formatMinutes(total.plannedMinutes)}</span>
                  </span>
                  <UsageBadge summary={total} />
                </div>
              </div>
              <UsageBar summary={total} />
            </Link>
          </li>
        );
      })}
    </ul>
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
