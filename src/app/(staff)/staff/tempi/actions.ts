"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getStaffContext, requireAllowed } from "@/lib/data/staff-context";
import { TIME_PERSON_COOKIE, closeStaleTimers } from "@/lib/data/time-tracking";
import { permissions } from "@/lib/permissions";
import { TIMER_MAX_MINUTES, todayInRome } from "@/lib/time-tracking";
import { TIME_AREAS, type TimeArea } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof getStaffContext>>["supabase"];

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isArea(value: string): value is TimeArea {
  return (TIME_AREAS as string[]).includes(value);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function refresh() {
  revalidatePath("/staff/tempi");
  revalidatePath("/staff/monitor");
}

// Ricorda su questo dispositivo l'ultima persona scelta.
async function rememberPerson(personId: string) {
  const store = await cookies();
  store.set(TIME_PERSON_COOKIE, personId, {
    path: "/staff",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export type TimeFormState = { error?: string; success?: boolean } | undefined;

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

// Chi non lavora più si disattiva: sparisce dai menu ma le sue ore passate restano nei totali.
export async function setTimePersonActive(formData: FormData) {
  const { supabase, profile } = await getStaffContext();
  requireAllowed(permissions.accessUsersPage(profile.role));

  await supabase
    .from("time_people")
    .update({ is_active: str(formData, "active") === "true" })
    .eq("id", str(formData, "id"));
  refresh();
}

// ---------------------------------------------------------------------------
// Scelte comuni a timer e inserimento manuale
// ---------------------------------------------------------------------------

type Selection = { personId: string; personName: string; projectId: string; area: TimeArea };

// Persona attiva, cantiere registrato e attivo con il cliente scelto, area valida.
async function readSelection(supabase: Supabase, formData: FormData): Promise<Selection | { error: string }> {
  const personId = str(formData, "person_id");
  const clientId = str(formData, "client_id");
  const projectId = str(formData, "project_id");
  const area = str(formData, "area");

  if (!personId) return { error: "Scegli la persona." };
  if (!clientId) return { error: "Scegli il cliente." };
  if (!projectId) return { error: "Scegli il cantiere." };
  if (!isArea(area)) return { error: "Scegli l'area: Progetto, Preventivazione o Cantiere." };

  const [{ data: person }, { data: project }] = await Promise.all([
    supabase.from("time_people").select("id, name, is_active").eq("id", personId).maybeSingle(),
    supabase.from("projects").select("id, client_id, is_archived").eq("id", projectId).maybeSingle(),
  ]);

  if (!person?.is_active) return { error: "Scegli la persona." };
  if (!project || project.is_archived || project.client_id !== clientId) {
    return { error: "Il cantiere scelto non appartiene a quel cliente." };
  }

  return { personId: person.id, personName: person.name, projectId: project.id, area };
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

export async function startTimer(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase, profile } = await getStaffContext();

  const sel = await readSelection(supabase, formData);
  if ("error" in sel) return sel;

  // Un timer dimenticato da più di 8 ore non deve bloccare il nuovo avvio.
  await closeStaleTimers(supabase);

  const { error } = await supabase.from("time_entries").insert({
    project_id: sel.projectId,
    person_id: sel.personId,
    recorded_by: profile.id,
    area: sel.area,
    started_at: new Date().toISOString(),
    source: "timer",
  });

  if (error) {
    // 23505 = indice univoco "un solo timer attivo per persona".
    if (error.code === "23505") return { error: `${sel.personName} ha già un timer attivo: fermalo prima di avviarne un altro.` };
    return { error: "Non è stato possibile avviare il timer." };
  }

  await rememberPerson(sel.personId);
  refresh();
  return { success: true };
}

export async function stopTimer(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase } = await getStaffContext();

  const entryId = str(formData, "entry_id");
  const { data: running } = await supabase
    .from("time_entries")
    .select("id, started_at")
    .eq("id", entryId)
    .is("ended_at", null)
    .maybeSingle();

  if (!running) return { error: "Questo timer non è più attivo." };

  const startedMs = new Date(running.started_at).getTime();
  // Mai oltre le 8 ore: oltre quel limite il timer si è già fermato da solo.
  const endedMs = Math.min(Date.now(), startedMs + TIMER_MAX_MINUTES * 60000);
  // Almeno 1 minuto: un timer fermato subito non deve sparire dal registro.
  const minutes = Math.max(1, Math.round((endedMs - startedMs) / 60000));

  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: new Date(endedMs).toISOString(), minutes, note: str(formData, "note") || null })
    .eq("id", running.id)
    .is("ended_at", null);

  if (error) return { error: "Non è stato possibile fermare il timer." };

  refresh();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Inserimento manuale ed eliminazione
// ---------------------------------------------------------------------------

export async function addManualEntry(_prev: TimeFormState, formData: FormData): Promise<TimeFormState> {
  const { supabase, profile } = await getStaffContext();

  const sel = await readSelection(supabase, formData);
  if ("error" in sel) return sel;

  const hours = Number(str(formData, "hours") || "0");
  const mins = Number(str(formData, "mins") || "0");
  const workDate = str(formData, "work_date") || todayInRome();

  if (!Number.isInteger(hours) || !Number.isInteger(mins) || hours < 0 || mins < 0 || mins > 59) {
    return { error: "Scegli ore e minuti dai menu." };
  }
  const minutes = hours * 60 + mins;
  if (minutes <= 0) return { error: "Indica quanto tempo hai dedicato." };
  if (minutes > 24 * 60) return { error: "Una singola voce non può superare 24 ore." };
  if (!isIsoDate(workDate)) return { error: "Data non valida." };
  if (workDate > todayInRome()) return { error: "Non puoi registrare tempo nel futuro." };

  // Oggi: la voce finisce "adesso". Giorni passati: orario indicativo mattina,
  // conta la data (il tempo effettivo è nei minuti).
  const endedAt =
    workDate === todayInRome() ? new Date() : new Date(new Date(`${workDate}T08:00:00Z`).getTime() + minutes * 60000);
  const startedAt = new Date(endedAt.getTime() - minutes * 60000);

  const { error } = await supabase.from("time_entries").insert({
    project_id: sel.projectId,
    person_id: sel.personId,
    recorded_by: profile.id,
    area: sel.area,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    minutes,
    note: str(formData, "note") || null,
    source: "manual",
  });

  if (error) return { error: "Non è stato possibile salvare il tempo." };

  await rememberPerson(sel.personId);
  refresh();
  return { success: true };
}

// Lo staff elimina le voci inserite con il proprio accesso, il Super User tutte:
// lo garantisce la policy sul database.
export async function deleteTimeEntry(formData: FormData) {
  const { supabase } = await getStaffContext();
  await supabase.from("time_entries").delete().eq("id", str(formData, "id"));
  refresh();
}
