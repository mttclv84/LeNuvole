// Script di seed: crea utenti demo (owner, staff, cliente) e un progetto
// fittizio "CASA BIZZOTTO" popolato, utile per la revisione visiva con Bea
// prima di collegare dati reali.
//
// Uso:
//   1. Copiare .env.local.example in .env.local e compilare le chiavi Supabase
//      (serve anche SUPABASE_SERVICE_ROLE_KEY, si trova in
//      Project Settings > API del progetto Supabase).
//   2. Eseguire le migration in supabase/migrations/*.sql (SQL Editor o
//      `supabase db push`) PRIMA di lanciare questo script.
//   3. npm run seed
//
// Lo script è idempotente sulle email: se un utente esiste già viene riusato.

import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Il seed crea account e dati DEMO: su un database reale non deve girare per
// sbaglio (ricreerebbe gli account demo appena eliminati). Per usarlo di
// proposito su un database di prova: ALLOW_DEMO_SEED=1.
if (process.env.ALLOW_DEMO_SEED !== "1") {
  console.error(
    "Seed demo non eseguito: crea account e dati di PROVA. Per lanciarlo davvero su un database di prova: " +
      "ALLOW_DEMO_SEED=1 npm run seed   (PowerShell: $env:ALLOW_DEMO_SEED=1; npm run seed)",
  );
  process.exit(1);
}

if (!url || !serviceRoleKey) {
  console.error(
    "Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

// Nessuna password nel codice (il repository è pubblico): se non la passi tu
// con SEED_PASSWORD, ne viene generata una casuale e stampata UNA volta a fine
// esecuzione. Valida solo per gli account creati da questo script.
const seedPassword = process.env.SEED_PASSWORD ?? randomBytes(18).toString("base64url");

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string) {
  // L'Admin API non ha una "get by email" diretta: pagina la lista utenti.
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(email: string, password: string) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function upsertProfile(profile: {
  id: string;
  role: "owner" | "staff" | "client";
  display_name: string;
}) {
  const { error } = await supabase.from("profiles").upsert(profile);
  if (error) throw error;
}

async function main() {
  console.log("Creazione utenti demo...");

  const owner = await ensureUser("bea@lenuvolecasaedesign.it", seedPassword);
  const staff = await ensureUser("staff.demo@lenuvolecasaedesign.it", seedPassword);
  const client = await ensureUser("cliente.demo@lenuvolecasaedesign.it", seedPassword);

  if (!owner || !staff || !client) throw new Error("Creazione utenti fallita");

  console.log("Creazione progetto demo CASA BIZZOTTO...");
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .upsert(
      {
        client_label: "CASA BIZZOTTO",
        status_light: "orange",
        status_reason: "In attesa di conferma dei serramenti da parte del cliente.",
      },
      { onConflict: "id" },
    )
    .select()
    .maybeSingle();

  // upsert senza id noto crea sempre una nuova riga la prima volta: gestiamo
  // il caso "già esistente" cercandolo per client_label se necessario.
  let projectId = project?.id as string | undefined;
  if (projectError || !projectId) {
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("client_label", "CASA BIZZOTTO")
      .maybeSingle();
    projectId = existingProject?.id;
  }
  if (!projectId) throw new Error("Impossibile creare/trovare il progetto demo");

  await upsertProfile({ id: owner.id, role: "owner", display_name: "Bea" });
  await upsertProfile({ id: staff.id, role: "staff", display_name: "Staff Le Nuvole" });
  await upsertProfile({ id: client.id, role: "client", display_name: "Famiglia Bizzotto" });

  // Il cantiere appartiene al cliente (un cliente può averne più d'uno).
  const { error: linkError } = await supabase.from("projects").update({ client_id: client.id }).eq("id", projectId);
  if (linkError) throw linkError;

  console.log("Popolamento budget, lavorazioni, timeline...");

  await supabase.from("budget_items").upsert([
    { project_id: projectId, label: "Impianto elettrico", amount: 4200, status: "confirmed" },
    { project_id: projectId, label: "Impianto idraulico", amount: 3100, status: "confirmed" },
    { project_id: projectId, label: "Serramenti su misura", amount: 8600, status: "pending" },
    { project_id: projectId, label: "Pavimento bagno extra", amount: 950, status: "pending" },
  ]);

  const dayOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  await supabase.from("work_items").upsert([
    {
      project_id: projectId,
      title: "Demolizioni",
      start_date: dayOffset(-21),
      end_date: dayOffset(-15),
      status: "done",
    },
    {
      project_id: projectId,
      title: "Impianto elettrico",
      start_date: dayOffset(-7),
      end_date: dayOffset(3),
      status: "in_progress",
    },
    {
      project_id: projectId,
      title: "Impianto idraulico",
      start_date: dayOffset(-7),
      end_date: dayOffset(5),
      status: "in_progress",
    },
    {
      project_id: projectId,
      title: "Conferma inizio serramenti",
      start_date: dayOffset(10),
      end_date: dayOffset(20),
      status: "planned",
    },
    {
      project_id: projectId,
      title: "Pavimenti e rivestimenti",
      start_date: dayOffset(25),
      end_date: dayOffset(35),
      status: "planned",
    },
  ]);

  await supabase.from("messages").insert({
    project_id: projectId,
    sender_profile_id: staff.id,
    sender_role: "staff",
    body: "Benvenuti nel vostro portale! Da qui potete seguire l'avanzamento del cantiere in ogni momento.",
  });

  console.log("\nFatto! Account demo (se esistevano già, la loro password NON è stata toccata):");
  console.log("  Owner  -> bea@lenuvolecasaedesign.it");
  console.log("  Staff  -> staff.demo@lenuvolecasaedesign.it");
  console.log("  Cliente-> cliente.demo@lenuvolecasaedesign.it");
  console.log(`  Password (solo per gli account appena creati): ${seedPassword}`);
  console.log("  Cambiala al primo accesso e non usare questi account in produzione.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
