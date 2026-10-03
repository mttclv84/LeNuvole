import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getStaffContext(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
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

  if (!profile || profile.role === "client" || !profile.active) {
    redirect("/login");
  }

  return { supabase, profile: profile as Profile };
}

export async function requireOwner(profile: Profile) {
  if (profile.role !== "owner") redirect("/staff");
}

// Per le regole di src/lib/permissions.ts: se non consentito, torna alla home staff.
export function requireAllowed(allowed: boolean) {
  if (!allowed) redirect("/staff");
}
