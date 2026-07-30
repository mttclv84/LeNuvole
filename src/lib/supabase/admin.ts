import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client con la Service Role key: bypassa la RLS.
// Usare SOLO in codice server-only (Server Actions in staff/*),
// mai importare da un componente client. Serve per creare/gestire
// account cliente e staff (Supabase Auth Admin API).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mancante: necessaria per la gestione utenti da pannello staff.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
