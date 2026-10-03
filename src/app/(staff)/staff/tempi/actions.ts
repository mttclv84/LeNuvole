"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStaffContext, requireAllowed } from "@/lib/data/staff-context";
import { TIME_PERSON_COOKIE } from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import { parseHours, todayInRome } from "@/lib/time-tracking";
import { TIME_AREAS, type TimeArea } from "@/lib/types";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isArea(value: string): value is TimeArea {
  return (TIME_AREAS as string[]).includes(value);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function refresh(jobId?: string) {
  revalidatePath("/staff/tempi");
  if (jobId) revalidatePath(`/staff/tempi/${jobId}`);
}

// Ricorda su questo dispositivo l'ultima persona scelta.
async function rememberPerson(personId: string) {
  const store = await cookies();
  store.set(TIME_PERSON_COOKIE, personId, {
    path: "/staff/tempi",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export type TimeFormState = { error?: string; success?: boolean } | undefined;

// ---------------------------------------------------------------------------
// Commesse
// ---------------------------------------------------------------------------

function readJobFields(formData: FormData):
  | { error: string }
  | {
      client_name: string;
      title: string;
      notes: string | null;
      est_design_h: number;
      est_quoting_h: number;
      est_site_h: number;
      project_id: string | null;
    } {
  const client_name = str(formData, "client_name");
  const title = str(formData, "title");
  const design = parseHours(str(formData, "est_design_h"));
  const quoting = parseHours(str(formData, "est_quoting_h"));
  const site = parseHours(str(formData, "est_site_h"));

  if (!client_name || !title) return { error: "Nome cliente e nome commessa sono obbligatori." };
  if (design === null || quoting === null || site === null) {
    return { error: "Le ore previste devono essere numeri positivi (es. 30 oppure 7,5)." };
  }

  return {
    client_name,
    title,
    notes: str(formData, "notes") || null,
    est_design_h: design,
    est_quoting_h: quoting,
    est_site_h: site,
    project_id: str(formData, "project_id") || null,
  };
}

export async function createTimeJob(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase, profile } = await getStaffContext();

  const fields = readJobFields(formData);
  if ("error" in fields) return fields;

  const openedOn = str(formData, "opened_on");
  if (openedOn && !isIsoDate(openedOn)) return { error: "Data di apertura non valida." };

  const { data, error } = await supabase
    .from("time_jobs")
    .insert({ ...fields, opened_on: openedOn || todayInRome(), created_by: profile.id })
    .select("id")
    .single();

  if (error || !data) return { error: "Non è stato possibile creare la commessa." };

  refresh();
  redirect(`/staff/tempi/${data.id}`);
}

export async function updateTimeJob(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase } = await getStaffContext();

  const id = str(formData, "id");
  const fields = readJobFields(formData);
  if ("error" in fields) return fields;

  const { data, error } = await supabase.from("time_jobs").update(fields).eq("id", id).select("id");
  if (error || !data || data.length === 0) return { error: "Non è stato possibile salvare le modifiche." };

  refresh(id);
  return { success: true };
}

export async function setTimeJobClosed(formData: FormData) {
  const { supabase } = await getStaffContext();
  const id = str(formData, "id");
  const closed = str(formData, "closed") === "true";

  await supabase.from("time_jobs").update({ is_closed: closed }).eq("id", id);
  refresh(id);
}

// Solo chi ha il permesso (Super User) elimina una commessa: porta con sé tutte le sue voci di tempo.
export async function deleteTimeJob(formData: FormData) {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.deleteForever(profile.role));

  await supabase.from("time_jobs").delete().eq("id", str(formData, "id"));
  refresh();
  redirect("/staff/tempi");
}

// ---------------------------------------------------------------------------
// Persone (Mattia, Federica, Lesly...): le gestisce solo il Super User
// ---------------------------------------------------------------------------

export async function createTimePerson(formData: FormData) {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.accessUsersPage(profile.role));

  const name = str(formData, "name");
  if (!name) return;

  const { data: last } = await supabase
    .from("time_people")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("time_people").insert({ name, sort_order: (last?.sort_order ?? 0) + 1 });
  refresh();
}

// Chi non lavora più sulle commesse si disattiva: sparisce dai menu ma le
// sue ore passate restano nei totali.
export async function setTimePersonActive(formData: FormData) {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.accessUsersPage(profile.role));

  await supabase
    .from("time_people")
    .update({ is_active: str(formData, "active") === "true" })
    .eq("id", str(formData, "id"));
  refresh();
}

// La persona deve esistere ed essere attiva.
async function findActivePerson(supabase: Awaited<ReturnType<typeof getStaffContext>>["supabase"], personId: string) {
  if (!personId) return null;
  const { data } = await supabase
    .from("time_people")
    .select("id, name, is_active")
    .eq("id", personId)
    .maybeSingle();
  return data?.is_active ? data : null;
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

export async function startTimer(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase, profile } = await getStaffContext();

  const jobId = str(formData, "job_id");
  const area = str(formData, "area");
  if (!jobId) return { error: "Scegli il cliente." };
  if (!isArea(area)) return { error: "Scegli l'area: Progetto, Preventivazione o Cantiere." };

  const person = await findActivePerson(supabase, str(formData, "person_id"));
  if (!person) return { error: "Scegli la persona." };

  const { error } = await supabase.from("time_entries").insert({
    job_id: jobId,
    person_id: person.id,
    recorded_by: profile.id,
    area,
    started_at: new Date().toISOString(),
    source: "timer",
  });

  if (error) {
    // 23505 = indice univoco "un solo timer attivo per persona".
    if (error.code === "23505") return { error: `${person.name} ha già un timer attivo: fermalo prima di avviarne un altro.` };
    return { error: "Non è stato possibile avviare il timer." };
  }

  await rememberPerson(person.id);
  refresh(jobId);
  return { success: true };
}

export async function stopTimer(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase } = await getStaffContext();

  const entryId = str(formData, "entry_id");
  const { data: running } = await supabase
    .from("time_entries")
    .select("id, job_id, started_at")
    .eq("id", entryId)
    .is("ended_at", null)
    .maybeSingle();

  if (!running) return { error: "Questo timer non è più attivo." };

  const now = new Date();
  const elapsedMs = now.getTime() - new Date(running.started_at).getTime();
  // Almeno 1 minuto: un timer fermato subito non deve sparire dal registro.
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));

  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: now.toISOString(), minutes, note: str(formData, "note") || null })
    .eq("id", running.id)
    .is("ended_at", null);

  if (error) return { error: "Non è stato possibile fermare il timer." };

  refresh(running.job_id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Inserimento manuale ed eliminazione
// ---------------------------------------------------------------------------

export async function addManualEntry(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase, profile } = await getStaffContext();

  const jobId = str(formData, "job_id");
  const area = str(formData, "area");
  const hours = Number(str(formData, "hours") || "0");
  const mins = Number(str(formData, "mins") || "0");
  const workDate = str(formData, "work_date") || todayInRome();

  if (!jobId) return { error: "Scegli il cliente." };
  if (!isArea(area)) return { error: "Scegli l'area: Progetto, Preventivazione o Cantiere." };
  if (!Number.isInteger(hours) || !Number.isInteger(mins) || hours < 0 || mins < 0) {
    return { error: "Ore e minuti devono essere numeri interi." };
  }
  const minutes = hours * 60 + mins;
  if (minutes <= 0) return { error: "Indica quanto tempo hai dedicato." };
  if (minutes > 24 * 60) return { error: "Una singola voce non può superare 24 ore." };
  if (!isIsoDate(workDate)) return { error: "Data non valida." };

  const person = await findActivePerson(supabase, str(formData, "person_id"));
  if (!person) return { error: "Scegli la persona." };

  const today = todayInRome();
  if (workDate > today) return { error: "Non puoi registrare tempo nel futuro." };

  // Oggi: la voce finisce "adesso". Giorni passati: orario indicativo mattina,
  // conta la data (il tempo effettivo è nei minuti).
  const endedAt =
    workDate === today ? new Date() : new Date(new Date(`${workDate}T08:00:00Z`).getTime() + minutes * 60000);
  const startedAt = new Date(endedAt.getTime() - minutes * 60000);

  const { error } = await supabase.from("time_entries").insert({
    job_id: jobId,
    person_id: person.id,
    recorded_by: profile.id,
    area,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    minutes,
    note: str(formData, "note") || null,
    source: "manual",
  });

  if (error) return { error: "Non è stato possibile salvare il tempo." };

  await rememberPerson(person.id);
  refresh(jobId);
  return { success: true };
}

// Lo staff elimina le voci inserite con il proprio accesso, il Super User tutte:
// lo garantisce la policy sul database, qui non serve altro controllo.
export async function deleteTimeEntry(formData: FormData) {
  const { supabase } = await getStaffContext();
  const id = str(formData, "id");
  const jobId = str(formData, "job_id");

  await supabase.from("time_entries").delete().eq("id", id);
  refresh(jobId);
}
