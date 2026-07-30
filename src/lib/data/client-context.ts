import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Project } from "@/lib/types";

/**
 * Contesto del cliente autenticato: profilo + progetto associato.
 * Il proxy garantisce già che solo un client attivo con progetto arrivi
 * fin qui, ma restiamo difensivi (dati coerenti anche in caso di anomalie).
 */
export async function getClientContext(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
  project: Project;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile || profile.role !== "client" || !profile.project_id) {
    redirect("/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", profile!.project_id)
    .maybeSingle();

  if (!project) redirect("/login");

  return { supabase, profile: profile as Profile, project: project as Project };
}
