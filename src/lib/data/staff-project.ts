import { notFound } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export async function getStaffProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<Project> {
  const { data } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!data) notFound();
  return data as Project;
}
