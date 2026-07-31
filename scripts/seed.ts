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

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

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
  project_id?: string | null;
}) {
  const { error } = await supabase.from("profiles").upsert(profile);
  if (error) throw error;
}

async function main() {
  console.log("Creazione utenti demo...");

  const owner = await ensureUser("bea@lenuvolecasaedesign.it", "CambiaSubito!2026");
  const staff = await ensureUser("staff.demo@lenuvolecasaedesign.it", "CambiaSubito!2026");
  const client = await ensureUser("cliente.demo@lenuvolecasaedesign.it", "CambiaSubito!2026");

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
  await upsertProfile({
    id: client.id,
    role: "client",
    display_name: "Famiglia Bizzotto",
    project_id: projectId,
  });

  console.log("Popolamento budget, lavorazioni, timeline...");

  await supabase.from("budget_items").upsert([
    { project_id: projectId, label: "Impianto elettrico", amount: 4200, status: "confirmed" },
    { project_id: projectId, label: "Impianto idraulico", amount: 3100, status: "confirmed" },
    { project_id: projectId, label: "Serramenti su misura", amount: 8600, status: "pending" },
    { project_id: projectId, label: "Pavimento bagno extra", amount: 950, status: "pending" },
  ]);

  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);

  await supabase.from("work_items").upsert([
    { project_id: projectId, title: "Impianto elettrico", week_start_date: weekStart, status: "in_progress" },
    { project_id: projectId, title: "Impianto idraulico", week_start_date: weekStart, status: "in_progress" },
    { project_id: projectId, title: "Conferma inizio serramenti", week_start_date: weekStart, status: "planned" },
  ]);

  await supabase.from("timeline_steps").upsert([
    { project_id: projectId, label: "Demolizioni", order_index: 1, status: "done" },
    { project_id: projectId, label: "Impianti", order_index: 2, status: "in_progress" },
    { project_id: projectId, label: "Serramenti e infissi", order_index: 3, status: "upcoming" },
    { project_id: projectId, label: "Pavimenti e rivestimenti", order_index: 4, status: "upcoming" },
    { project_id: projectId, label: "Consegna chiavi in mano", order_index: 5, status: "upcoming" },
  ]);

  await supabase.from("messages").insert({
    project_id: projectId,
    sender_profile_id: staff.id,
    sender_role: "staff",
    body: "Benvenuti nel vostro portale! Da qui potete seguire l'avanzamento del cantiere in ogni momento.",
  });

  console.log("\nFatto! Credenziali demo (cambiare la password al primo accesso):");
  console.log("  Owner  -> bea@lenuvolecasaedesign.it / CambiaSubito!2026");
  console.log("  Staff  -> staff.demo@lenuvolecasaedesign.it / CambiaSubito!2026");
  console.log("  Cliente-> cliente.demo@lenuvolecasaedesign.it / CambiaSubito!2026");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
