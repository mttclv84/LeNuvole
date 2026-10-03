import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Project, ProjectTiming, TimeEntry, TimePerson } from "@/lib/types";

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
  const { data } = await supabase.from("time_people").select("*").order("sort_order").order("name");
  return (data ?? []) as TimePerson[];
}

export type ProjectRef = Pick<Project, "id" | "client_label" | "client_id" | "is_archived">;
export type ClientRef = Pick<Profile, "id" | "display_name" | "active">;

// Cantieri e clienti registrati: le uniche scelte possibili nei menu dei Tempi
// e i nomi mostrati nel Monitor.
export async function getProjectsAndClients(supabase: Supabase) {
  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("id, client_label, client_id, is_archived").order("client_label"),
    supabase.from("profiles").select("id, display_name, active").eq("role", "client").order("display_name"),
  ]);
  return {
    projects: (projects ?? []) as ProjectRef[],
    clients: (clients ?? []) as ClientRef[],
  };
}

export async function getTimings(supabase: Supabase): Promise<ProjectTiming[]> {
  const { data } = await supabase.from("project_timing").select("*");
  return (data ?? []) as ProjectTiming[];
}

// Chiude a 8 ore esatte i timer dimenticati accesi (funzione sul database,
// migration 0013). Va chiamata prima di leggere timer in corso o totali.
export async function closeStaleTimers(supabase: Supabase) {
  await supabase.rpc("close_stale_timers");
}

// Timer in corso (al massimo uno per persona: lo garantisce un indice sul database).
export async function getRunningEntries(supabase: Supabase): Promise<TimeEntry[]> {
  await closeStaleTimers(supabase);
  const { data } = await supabase.from("time_entries").select("*").is("ended_at", null).order("started_at");
  return (data ?? []) as TimeEntry[];
}

// Tutte le voci chiuse, con i soli campi che servono a sommare i minuti.
export async function getClosedEntriesForTotals(supabase: Supabase) {
  const { data } = await supabase
    .from("time_entries")
    .select("project_id, person_id, area, minutes, started_at")
    .not("minutes", "is", null);
  return (data ?? []) as Pick<TimeEntry, "project_id" | "person_id" | "area" | "minutes" | "started_at">[];
}

// Storico, dalla più recente, una pagina alla volta.
export async function getEntriesPage(supabase: Supabase, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from("time_entries")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return { entries: (data ?? []) as TimeEntry[], total: count ?? 0 };
}

// Ultima voce della persona: preseleziona cantiere e area per ripartire con un tocco.
export async function getLastEntryForPerson(supabase: Supabase, personId: string): Promise<TimeEntry | null> {
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("person_id", personId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as TimeEntry | null) ?? null;
}
