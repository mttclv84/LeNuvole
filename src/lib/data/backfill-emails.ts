import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

// Alcuni profili (creati prima che esistesse la colonna profiles.email, o
// dai dati demo) non hanno l'email salvata in tabella: qui si recupera da
// auth.users solo per quelli mancanti, così le pagine di elenco/modifica la
// mostrano sempre correttamente senza bisogno di una migration di backfill.
export async function withEmails<T extends Pick<Profile, "id" | "email">>(profiles: T[]): Promise<T[]> {
  const missing = profiles.filter((p) => !p.email);
  if (missing.length === 0) return profiles;

  const admin = createAdminClient();
  const emailById = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    data.users.forEach((u) => {
      if (u.email) emailById.set(u.id, u.email);
    });
    if (data.users.length < 200) break;
    page += 1;
  }

  return profiles.map((p) => (p.email ? p : { ...p, email: emailById.get(p.id) ?? p.email }));
}
