import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Project } from "@/lib/types";

// Cantiere scelto dal cliente, se ne ha più d'uno (vedi selectClientProject).
export const CLIENT_PROJECT_COOKIE = "cantiere";

/**
 * Contesto del cliente autenticato: profilo, tutti i suoi cantieri e quello
 * che sta consultando. Un cliente può avere più cantieri: si sceglie con il
 * selettore in alto, ricordato in un cookie; senza scelta valida vale il primo
 * (gli attivi prima dei disattivati, poi i più recenti).
 * Il proxy garantisce già che solo un client attivo con almeno un cantiere
 * arrivi fin qui, ma restiamo difensivi.
 */
export async function getClientContext(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
  project: Project;
  projects: Project[];
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

  if (!profile || profile.role !== "client") {
    redirect("/login");
  }

  const { data: projectsData } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", user!.id)
    .order("is_archived")
    .order("created_at", { ascending: false });

  const projects = (projectsData ?? []) as Project[];
  if (projects.length === 0) redirect("/nessun-cantiere");

  const store = await cookies();
  const chosenId = store.get(CLIENT_PROJECT_COOKIE)?.value;
  const project = projects.find((p) => p.id === chosenId) ?? projects[0];

  return { supabase, profile: profile as Profile, project, projects };
}
