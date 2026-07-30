"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/data/staff-context";

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
  if (!client_label) return;

  const { data, error } = await supabase
    .from("projects")
    .insert({ client_label })
    .select("id")
    .single();

  if (error || !data) return;
  revalidatePath("/staff");
  redirect(`/staff/${data.id}`);
}

export async function updateProjectStatus(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  const status_light = str(formData, "status_light");
  const status_reason = str(formData, "status_reason");

  await supabase
    .from("projects")
    .update({ status_light, status_reason: status_reason || null })
    .eq("id", projectId);

  revalidatePath(`/staff/${projectId}`);
  revalidatePath("/staff");
}

export async function archiveProject(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const projectId = str(formData, "project_id");
  await supabase.from("projects").update({ is_archived: true }).eq("id", projectId);
  revalidatePath(`/staff/${projectId}`);
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
// Lavorazioni della settimana
// ---------------------------------------------------------------------------

export async function addWorkItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const title = str(formData, "title");
  const week_start_date = str(formData, "week_start_date");
  const status = str(formData, "status") || "planned";
  if (!title || !week_start_date) return;

  await supabase.from("work_items").insert({ project_id, title, week_start_date, status });
  revalidatePath(`/staff/${project_id}`);
}

export async function updateWorkItemStatus(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const status = str(formData, "status");
  await supabase.from("work_items").update({ status }).eq("id", id);
  revalidatePath(`/staff/${project_id}`);
}

export async function deleteWorkItem(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  await supabase.from("work_items").delete().eq("id", id);
  revalidatePath(`/staff/${project_id}`);
}

// ---------------------------------------------------------------------------
// Timeline (sostituto del Gantt)
// ---------------------------------------------------------------------------

export async function addTimelineStep(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const project_id = str(formData, "project_id");
  const label = str(formData, "label");
  if (!label) return;

  const { count } = await supabase
    .from("timeline_steps")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id);

  await supabase
    .from("timeline_steps")
    .insert({ project_id, label, order_index: (count ?? 0) + 1, status: "upcoming" });
  revalidatePath(`/staff/${project_id}`);
}

export async function updateTimelineStepStatus(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  const status = str(formData, "status");
  await supabase.from("timeline_steps").update({ status }).eq("id", id);
  revalidatePath(`/staff/${project_id}`);
}

export async function deleteTimelineStep(formData: FormData) {
  await getStaffContext();
  const supabase = await createClient();
  const id = str(formData, "id");
  const project_id = str(formData, "project_id");
  await supabase.from("timeline_steps").delete().eq("id", id);
  revalidatePath(`/staff/${project_id}`);
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
