import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { TimeArea, TimeEntry, TimeJob, TimePerson } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Ricorda su questo dispositivo l'ultima persona scelta, così dal secondo
// tocco in poi il menu "Persona" è già a posto.
export const TIME_PERSON_COOKIE = "tempi_person";

export async function getRememberedPersonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(TIME_PERSON_COOKIE)?.value ?? null;
}

// Elenco persone (attive e non), nell'ordine scelto. Chi non è più attivo
// resta qui per mostrare il nome nelle ore passate, ma non compare nei menu.
export async function getTimePeople(supabase: Supabase): Promise<TimePerson[]> {
  const { data } = await supabase
    .from("time_people")
    .select("*")
    .order("sort_order")
    .order("name");
  return (data ?? []) as TimePerson[];
}

export interface RunningTimer {
  entry: TimeEntry;
  job: TimeJob;
  person: TimePerson | undefined;
}

// Tutti i timer in corso (al massimo uno per persona: lo garantisce un indice
// sul database). Con jobId solo quelli di quella commessa.
export async function getRunningTimers(
  supabase: Supabase,
  people: TimePerson[],
  jobId?: string,
): Promise<RunningTimer[]> {
  let query = supabase.from("time_entries").select("*").is("ended_at", null).order("started_at");
  if (jobId) query = query.eq("job_id", jobId);
  const { data: entries } = await query;
  if (!entries || entries.length === 0) return [];

  const jobIds = [...new Set(entries.map((e) => e.job_id))];
  const { data: jobs } = await supabase.from("time_jobs").select("*").in("id", jobIds);
  const jobById = new Map(((jobs ?? []) as TimeJob[]).map((j) => [j.id, j]));
  const personById = new Map(people.map((p) => [p.id, p]));

  return (entries as TimeEntry[]).flatMap((entry) => {
    const job = jobById.get(entry.job_id);
    return job ? [{ entry, job, person: personById.get(entry.person_id) }] : [];
  });
}

export interface JobWithEntries {
  job: TimeJob;
  entries: TimeEntry[];
}

export async function getJobWithEntries(supabase: Supabase, jobId: string): Promise<JobWithEntries | null> {
  const [{ data: job }, { data: entries }] = await Promise.all([
    supabase.from("time_jobs").select("*").eq("id", jobId).maybeSingle(),
    supabase.from("time_entries").select("*").eq("job_id", jobId).order("started_at", { ascending: false }),
  ]);
  if (!job) return null;
  return { job: job as TimeJob, entries: (entries ?? []) as TimeEntry[] };
}

// Commesse con le relative voci, per i totali nella home. Le voci sono solo
// quelle necessarie a sommare i minuti (pochi campi).
export async function getJobsOverview(supabase: Supabase) {
  const [{ data: jobs }, { data: entries }] = await Promise.all([
    supabase.from("time_jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("time_entries").select("job_id, person_id, area, minutes"),
  ]);

  const entriesByJob = new Map<string, { area: TimeArea; person_id: string; minutes: number | null }[]>();
  for (const e of entries ?? []) {
    const list = entriesByJob.get(e.job_id) ?? [];
    list.push({ area: e.area as TimeArea, person_id: e.person_id, minutes: e.minutes });
    entriesByJob.set(e.job_id, list);
  }

  return ((jobs ?? []) as TimeJob[]).map((job) => ({ job, entries: entriesByJob.get(job.id) ?? [] }));
}

// Ultime voci di una persona: servono a preselezionare l'ultima commessa e
// l'ultima area usate (così avviare il timer richiede un solo tocco) e a
// mettere in cima le commesse su cui sta lavorando.
export async function getRecentEntriesForPerson(supabase: Supabase, personId: string): Promise<TimeEntry[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("person_id", personId)
    .order("started_at", { ascending: false })
    .limit(30);
  return (data ?? []) as TimeEntry[];
}
