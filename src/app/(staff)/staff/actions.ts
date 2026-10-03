"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";

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

  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_label,
      contract_signed_date: contract_signed_date || null,
      work_start_date: work_start_date || null,
    })
    .select("id")
    .single();

  if (error || !data) return;

  // Il cliente selezionato passa da "registrato" a "gestito" (ora ha un
  // cantiere abbinato e può vederlo entrando nel portale).
  await supabase.from("profiles").update({ project_id: data.id }).eq("id", client_id);

  revalidatePath("/staff");
  revalidatePath("/staff/clienti");
  redirect(`/staff/${data.id}`);
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
  const contract_signed_date = str(formData, "contract_signed_date");
  const work_start_date = str(formData, "work_start_date");
  const color = str(formData, "color");

  const { error } = await supabase
    .from("projects")
    .update({
      status_light,
      status_reason: status_reason || null,
      contract_signed_date: contract_signed_date || null,
      work_start_date: work_start_date || null,
      ...(color && { color }),
    })
    .eq("id", projectId);

  revalidatePath(`/staff/${projectId}`);
  revalidatePath("/staff");

  if (error) {
    return { error: "Non è stato possibile salvare le modifiche." };
  }
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

export async function addBudgetItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const label = str(formData, "label");
  const amount = Number(str(formData, "amount"));
  const status = str(formData, "status") || "pending";
  if (!label || Number.isNaN(amount)) return;

  await supabase.from("budget_items").insert({ project_id, label, amount, status });
  revalidatePath(`/staff/${project_id}`);
}

export async function toggleBudgetItemStatus(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const status = str(formData, "status");
  await supabase.from("budget_items").update({ status }).eq("id", id);
  revalidatePath(`/staff/${project_id}`);
}

export async function deleteBudgetItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  await supabase.from("budget_items").delete().eq("id", id);
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

  const path = `${project_id}/media/${crypto.randomUUID()}-${file.name}`;
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

  const path = `${project_id}/documents/${crypto.randomUUID()}-${file.name}`;
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
