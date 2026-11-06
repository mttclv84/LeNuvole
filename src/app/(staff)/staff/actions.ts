"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { safeFileName, todayInItaly } from "@/lib/utils";
import { BUDGET_KIND_LABEL, type BudgetKind } from "@/lib/types";

const BUCKET = "project-files";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

// ---------------------------------------------------------------------------
// Progetti
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData) {
  await getStaffContext(); // verifica sessione/ruolo (la RLS protegge comunque l'insert)
  const supabase = await createClient();
  const client_label = str(formData, "client_label");
  const client_id = str(formData, "client_id");
  const contract_signed_date = str(formData, "contract_signed_date");
  const work_start_date = str(formData, "work_start_date");
  if (!client_label || !client_id) return;

  // Un cliente può avere più cantieri: il cantiere nasce già abbinato al
  // cliente scelto, che da "registrato" diventa (o resta) "gestito".
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_label,
      client_id,
      contract_signed_date: contract_signed_date || null,
      work_start_date: work_start_date || null,
    })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/staff");
  revalidatePath("/staff/clienti");
  // Subito alla sezione Timing, per inserire le ore previste.
  redirect(`/staff/${data.id}/timing`);
}

export type UpdateProjectStatusState = { error?: string; success?: boolean } | undefined;

export async function updateProjectStatus(
  _prevState: UpdateProjectStatusState,
  formData: FormData,
): Promise<UpdateProjectStatusState> {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  const status_light = str(formData, "status_light");
  const status_reason = str(formData, "status_reason");
  const client_id = str(formData, "client_id");

  // Colore Gantt e date contrattuali hanno un form a parte (saveProjectKeyData).
  const { error } = await supabase
    .from("projects")
    .update({
      status_light,
      status_reason: status_reason || null,
      ...(client_id && { client_id }),
    })
    .eq("id", projectId);

  revalidatePath(`/staff/${projectId}`);
  revalidatePath("/staff");
  revalidatePath("/staff/clienti");

  if (error) {
    return { error: "Non è stato possibile salvare le modifiche." };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Dati contrattuali: colore Gantt, data firma contratto, data inizio lavori.
// Salvati tutti e tre restano bloccati; si sbloccano solo con un
// giustificativo (registrato), poi si salvano di nuovo. Il blocco è difeso
// anche dal database (trigger check_project_key_data_lock, migration 0014).
// ---------------------------------------------------------------------------

export type KeyDataState = { error?: string; success?: boolean } | undefined;

export async function saveProjectKeyData(_prev: KeyDataState, formData: FormData): Promise<KeyDataState> {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  const color = str(formData, "color");
  const contract_signed_date = str(formData, "contract_signed_date");
  const work_start_date = str(formData, "work_start_date");

  const complete = Boolean(color && contract_signed_date && work_start_date);
  const { error } = await supabase
    .from("projects")
    .update({
      ...(color && { color }),
      contract_signed_date: contract_signed_date || null,
      work_start_date: work_start_date || null,
      key_data_locked_at: complete ? new Date().toISOString() : null,
    })
    .eq("id", projectId);

  revalidatePath(`/staff/${projectId}`);
  revalidatePath("/staff");
  if (error) {
    return { error: "Non è stato possibile salvare: i dati potrebbero essere bloccati, ricarica la pagina." };
  }
  return { success: true };
}

export async function unlockProjectKeyData(_prev: KeyDataState, formData: FormData): Promise<KeyDataState> {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  const reason = str(formData, "reason");
  if (!reason) return { error: "Scrivi il motivo dello sblocco." };

  const { error } = await supabase.rpc("unlock_project_key_data", { p_project_id: projectId, p_reason: reason });
  revalidatePath(`/staff/${projectId}`);
  if (error) return { error: "Non è stato possibile sbloccare i dati." };
  return { success: true };
}

export async function archiveProject(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  await supabase.from("projects").update({ is_archived: true }).eq("id", projectId);
  revalidatePath(`/staff/${projectId}`);
  revalidatePath("/staff");
}

export async function reactivateProject(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  await supabase.from("projects").update({ is_archived: false }).eq("id", projectId);
  revalidatePath(`/staff/${projectId}`);
  revalidatePath("/staff");
}

// Cancellazione definitiva (solo da cantieri già disattivati): elimina il
// progetto e, in cascata, tutti i dati collegati (budget, lavorazioni,
// timeline, foto, documenti, pagamenti, chat, notifiche — le FK sono tutte
// "on delete cascade"). I clienti eventualmente assegnati tornano
// "registrati" (project_id passa a null via "on delete set null"). Best
// effort: ripulisce anche i file caricati nello storage.
export async function deleteProjectPermanently(formData: FormData) {
  const { profile } = await getStaffContext();
  // Operazione non reversibile: solo chi ha il permesso (Admin principale).
  if (!permissions.deleteForever(profile.role)) return;
  const supabase = await createClient();
  const projectId = str(formData, "project_id");

  for (const folder of ["media", "documents", "chat"]) {
    const { data: files } = await supabase.storage.from(BUCKET).list(`${projectId}/${folder}`);
    if (files && files.length > 0) {
      await supabase.storage.from(BUCKET).remove(files.map((f) => `${projectId}/${folder}/${f.name}`));
    }
  }

  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/staff");
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

// Portafoglio cliente: conferme d'ordine (il conto da pagare) e fatture
// (da saldare / saldate). Le modifica solo lo staff, il cliente le vede.
const BUDGET_KINDS: BudgetKind[] = ["conferma_ordine", "fattura_acconto", "fattura_avanzamento", "fattura_saldo"];

export async function addBudgetItem(formData: FormData) {
  const { profile } = await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const kind = str(formData, "kind") as BudgetKind;
  const amount = Number(str(formData, "amount").replace(",", "."));
  if (!BUDGET_KINDS.includes(kind) || !amount || Number.isNaN(amount)) return;
  // La descrizione è facoltativa: senza, vale il nome del tipo.
  const label = str(formData, "label") || BUDGET_KIND_LABEL[kind];

  await supabase
    .from("budget_items")
    .insert({ project_id, kind, label, amount, status: "confirmed", created_by: profile.id });
  revalidatePath(`/staff/${project_id}`);
}

export async function setInvoicePaid(formData: FormData) {
  const { profile } = await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const paid = str(formData, "paid") === "true";
  // Data effettiva scelta nel popup (proposta: oggi); mai nel futuro.
  const chosen = str(formData, "paid_date");
  const today = todayInItaly();
  const paid_at = /^\d{4}-\d{2}-\d{2}$/.test(chosen) && chosen <= today ? chosen : today;
  await supabase
    .from("budget_items")
    .update(
      paid
        ? { paid_at, paid_recorded_at: new Date().toISOString(), paid_by: profile.id }
        : { paid_at: null, paid_recorded_at: null, paid_by: null },
    )
    .eq("id", id)
    .neq("kind", "conferma_ordine");
  revalidatePath(`/staff/${project_id}`);
}

export async function deleteBudgetItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  // Motivazione obbligatoria: finisce nei Logs con i dati della voce
  // (funzione delete_budget_item, migration 0017).
  const reason = str(formData, "reason");
  if (!reason) return;
  await supabase.rpc("delete_budget_item", { p_id: id, p_reason: reason });
  revalidatePath(`/staff/${project_id}`);
}

// ---------------------------------------------------------------------------
// Lavorazioni previste (alimentano anche la vista "Avanzamento", generata
// automaticamente da queste voci ordinate per data di inizio)
// ---------------------------------------------------------------------------

export async function addWorkItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const title = str(formData, "title");
  const start_date = str(formData, "start_date");
  const end_date = str(formData, "end_date");
  if (!title || !start_date || !end_date) return;

  // Nuova lavorazione: parte sempre da "Da iniziare" — lo stato si imposta
  // dopo, dalla lista, quando serve davvero (in corso/posticipo/ecc.).
  await supabase.from("work_items").insert({ project_id, title, start_date, end_date, status: "planned" });
  revalidatePath(`/staff/${project_id}`);
  revalidatePath("/dashboard");
}

export async function updateWorkItemStatus(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const status = str(formData, "status");
  await supabase.from("work_items").update({ status }).eq("id", id);
  revalidatePath(`/staff/${project_id}`);
  revalidatePath("/dashboard");
}

export async function deleteWorkItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  await supabase.from("work_items").delete().eq("id", id);
  revalidatePath(`/staff/${project_id}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Foto / disegni / render
// ---------------------------------------------------------------------------

export async function uploadMedia(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const type = str(formData, "type") || "photo";
  const caption = str(formData, "caption");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const path = `${project_id}/media/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) return;

  await supabase.from("media").insert({ project_id, type, caption: caption || null, storage_path: path });
  revalidatePath(`/staff/${project_id}/foto`);
}

export async function deleteMedia(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const storage_path = str(formData, "storage_path");

  await supabase.storage.from(BUCKET).remove([storage_path]);
  await supabase.from("media").delete().eq("id", id);
  revalidatePath(`/staff/${project_id}/foto`);
}

// ---------------------------------------------------------------------------
// Documenti
// ---------------------------------------------------------------------------

export async function uploadDocument(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const category = str(formData, "category") || "other";
  const title = str(formData, "title");
  const requires_signature = formData.get("requires_signature") === "on";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0 || !title) return;

  const path = `${project_id}/documents/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) return;

  await supabase
    .from("documents")
    .insert({ project_id, category, title, storage_path: path, requires_signature });
  revalidatePath(`/staff/${project_id}/documenti`);
}

export async function markDocumentSigned(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  await supabase.from("documents").update({ signed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/staff/${project_id}/documenti`);
}

export async function deleteDocument(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const storage_path = str(formData, "storage_path");

  await supabase.storage.from(BUCKET).remove([storage_path]);
  await supabase.from("documents").delete().eq("id", id);
  revalidatePath(`/staff/${project_id}/documenti`);
}
