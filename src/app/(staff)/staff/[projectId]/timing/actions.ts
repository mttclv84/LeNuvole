"use server";

import { revalidatePath } from "next/cache";
import { getStaffContext } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import { TIMING_MAX_HOURS } from "@/lib/time-tracking";

export type TimingFormState = { error?: string; success?: boolean } | undefined;

function hours(formData: FormData, key: string): number | null {
  const value = Number(String(formData.get(key) ?? ""));
  return Number.isInteger(value) && value >= 0 && value <= TIMING_MAX_HOURS ? value : null;
}

// Primo salvataggio: tutto lo staff. Da lì le ore sono definitive e le cambia
// solo il Super User (lo impone anche la policy sul database).
export async function saveProjectTiming(_prev: TimingFormState, formData: FormData): Promise<TimingFormState> {
  const { supabase, profile } = await getStaffContext();

  const projectId = String(formData.get("project_id") ?? "");
  const est_design_h = hours(formData, "est_design_h");
  const est_quoting_h = hours(formData, "est_quoting_h");
  const est_site_h = hours(formData, "est_site_h");

  if (!projectId) return { error: "Cantiere non valido." };
  if (est_design_h === null || est_quoting_h === null || est_site_h === null) {
    return { error: `Scegli le ore dai menu (da 0 a ${TIMING_MAX_HOURS}).` };
  }

  const values = { est_design_h, est_quoting_h, est_site_h, saved_by: profile.id, saved_at: new Date().toISOString() };

  const { data: existing } = await supabase.from("project_timing").select("id").eq("project_id", projectId).maybeSingle();

  if (existing) {
    if (!permissions.editSavedTiming(profile.role)) {
      return { error: "Le ore sono già state salvate: può modificarle solo il Super User." };
    }
    const { error } = await supabase.from("project_timing").update(values).eq("id", existing.id);
    if (error) return { error: "Non è stato possibile salvare le ore." };
  } else {
    const { error } = await supabase.from("project_timing").insert({ project_id: projectId, ...values });
    // 23505: qualcun altro le ha salvate un attimo prima.
    if (error) {
      return {
        error: error.code === "23505" ? "Le ore sono appena state salvate da un altro accesso." : "Non è stato possibile salvare le ore.",
      };
    }
  }

  revalidatePath(`/staff/${projectId}/timing`);
  revalidatePath("/staff/monitor");
  return { success: true };
}
