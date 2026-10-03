import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmWordDialog } from "@/components/confirm-word-dialog";
import { LiveRefresh } from "@/components/live-refresh";
import { getStaffContext } from "@/lib/data/staff-context";
import { getJobWithEntries, getRememberedPersonId, getRunningTimers, getTimePeople } from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import { formatMinutes, summarizeJob, todayInRome } from "@/lib/time-tracking";
import { formatDate, formatDateTime } from "@/lib/utils";
import { TIME_AREA_LABEL, type Project } from "@/lib/types";
import { deleteTimeEntry, deleteTimeJob, setTimeJobClosed } from "../actions";
import { JobEditForm } from "../job-edit-form";
import { ManualEntryButton } from "../job-modals";
import { TimerCard, type RunningTimerView } from "../timer-card";
import { UsageBadge, UsageBar } from "../usage";

const MAX_ENTRIES_SHOWN = 60;

export default async function TimeJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const { supabase, profile } = await getStaffContext();

  const people = await getTimePeople(supabase);
  const [data, running, rememberedId, { data: projects }] = await Promise.all([
    getJobWithEntries(supabase, jobId),
    getRunningTimers(supabase, people, jobId),
    getRememberedPersonId(),
    supabase.from("projects").select("id, client_label").eq("is_archived", false).order("client_label"),
  ]);
  if (!data) notFound();

  const { job, entries } = data;
  const summary = summarizeJob(job, entries);
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  const activePeople = people.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }));
  const defaultPersonId = activePeople.find((p) => p.id === rememberedId)?.id;

  // Persone in elenco: tutte quelle attive (anche a 0 ore) più chiunque abbia già registrato tempo.
  const minutesByPerson = new Map(summary.perPerson.map((p) => [p.personId, p.minutes]));
  const personRows = people
    .map((p) => ({ id: p.id, name: p.name, active: p.is_active, minutes: minutesByPerson.get(p.id) ?? 0 }))
    .filter((p) => p.active || p.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const runningViews: RunningTimerView[] = running.map((r) => ({
    entryId: r.entry.id,
    personName: r.person?.name ?? "—",
    jobLabel: `${r.job.client_name} — ${r.job.title}`,
    area: r.entry.area,
    startedAt: r.entry.started_at,
  }));

  const lastOfPerson = defaultPersonId ? entries.find((e) => e.person_id === defaultPersonId) : undefined;
  const projectOptions = ((projects ?? []) as Pick<Project, "id" | "client_label">[]).map((p) => ({
    id: p.id,
    label: p.client_label,
  }));
  const canDeleteJob = permissions.deleteForever(profile.role);
  const canCorrectOthers = permissions.correctOthersTime(profile.role);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <LiveRefresh
        channel={`staff-tempi-${job.id}`}
        subscriptions={[
          { table: "time_entries", filter: `job_id=eq.${job.id}` },
          { table: "time_jobs", filter: `id=eq.${job.id}` },
        ]}
      />

      <div>
        <Link href="/staff/tempi" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tempi
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{job.client_name}</h1>
          {job.is_closed && <Badge>Chiusa</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {job.title} · aperta il {formatDate(job.opened_on)}
        </p>
        {job.notes && <p className="mt-2 text-sm">{job.notes}</p>}
      </div>

      {/* Colpo d'occhio: previste / utilizzate / residue */}
      <Card>
        <CardHeader>
          <CardTitle>Ore previste e utilizzate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Previste <strong className="text-foreground">{formatMinutes(summary.total.plannedMinutes)}</strong> ·
            utilizzate <strong className="text-foreground">{formatMinutes(summary.total.usedMinutes)}</strong> ·{" "}
            {summary.total.remainingMinutes >= 0 ? (
              <>
                residue <strong className="text-foreground">{formatMinutes(summary.total.remainingMinutes)}</strong>
              </>
            ) : (
              <strong className="text-status-red">+{formatMinutes(-summary.total.remainingMinutes)} oltre il previsto</strong>
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Area</th>
                  <th className="pb-2 text-right font-medium">Previste</th>
                  <th className="pb-2 text-right font-medium">Utilizzate</th>
                  <th className="pb-2 text-right font-medium">Residue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.areas.map((a) => (
                  <tr key={a.area}>
                    <td className="py-2.5 pr-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{TIME_AREA_LABEL[a.area]}</span>
                        <UsageBadge summary={a} />
                      </div>
                      <UsageBar summary={a} className="mt-1.5" />
                    </td>
                    <td className="py-2.5 text-right align-top tabular-nums">{formatMinutes(a.plannedMinutes)}</td>
                    <td className="py-2.5 text-right align-top tabular-nums">{formatMinutes(a.usedMinutes)}</td>
                    <td
                      className={`py-2.5 text-right align-top tabular-nums ${a.remainingMinutes < 0 ? "font-semibold text-status-red" : ""}`}
                    >
                      {a.remainingMinutes < 0 ? `+${formatMinutes(-a.remainingMinutes)}` : formatMinutes(a.remainingMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="pt-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      Totale <UsageBadge summary={summary.total} />
                    </div>
                  </td>
                  <td className="pt-2.5 text-right tabular-nums">{formatMinutes(summary.total.plannedMinutes)}</td>
                  <td className="pt-2.5 text-right tabular-nums">{formatMinutes(summary.total.usedMinutes)}</td>
                  <td
                    className={`pt-2.5 text-right tabular-nums ${summary.total.remainingMinutes < 0 ? "text-status-red" : ""}`}
                  >
                    {summary.total.remainingMinutes < 0
                      ? `+${formatMinutes(-summary.total.remainingMinutes)}`
                      : formatMinutes(summary.total.remainingMinutes)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Ore per persona */}
          <ul className="mt-5 grid gap-1.5 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {personRows.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span>{p.name}</span>
                <span className="font-semibold tabular-nums">{formatMinutes(p.minutes)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Registrazione tempo su questa commessa */}
      {!job.is_closed && (
        <div className="flex flex-col gap-3">
          <TimerCard
            running={runningViews}
            jobs={[]}
            people={activePeople}
            fixedJobId={job.id}
            defaultArea={lastOfPerson?.area}
            defaultPersonId={defaultPersonId}
          />
          <div className="flex">
            <ManualEntryButton
              jobs={[]}
              people={activePeople}
              fixedJobId={job.id}
              defaultArea={lastOfPerson?.area}
              defaultPersonId={defaultPersonId}
              today={todayInRome()}
            />
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tempi registrati</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ancora nessun tempo registrato.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {entries.slice(0, MAX_ENTRIES_SHOWN).map((e) => {
                const canDelete = e.minutes !== null && (e.recorded_by === profile.id || canCorrectOthers);
                return (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {nameById.get(e.person_id) ?? "—"} · {TIME_AREA_LABEL[e.area]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(e.started_at)}
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
                          <input type="hidden" name="job_id" value={job.id} />
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
          {entries.length > MAX_ENTRIES_SHOWN && (
            <p className="mt-3 text-xs text-muted-foreground">
              Mostrate le ultime {MAX_ENTRIES_SHOWN} voci su {entries.length}. I totali includono tutte.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifica commessa e ore previste</CardTitle>
        </CardHeader>
        <CardContent>
          <JobEditForm job={job} projects={projectOptions} />

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <form action={setTimeJobClosed}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="closed" value={job.is_closed ? "false" : "true"} />
              <Button type="submit" variant="outline">
                {job.is_closed ? "Riapri commessa" : "Chiudi commessa"}
              </Button>
            </form>

            {canDeleteJob && (
              <ConfirmWordDialog
                triggerLabel="Elimina definitivamente"
                triggerClassName="text-sm font-medium text-status-red hover:underline"
                title="Elimina commessa"
                description={`La commessa "${job.client_name}" e tutti i tempi registrati verranno eliminati per sempre. L'operazione non è reversibile.`}
                word="ELIMINA"
                action={deleteTimeJob}
                hiddenFields={{ id: job.id }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
