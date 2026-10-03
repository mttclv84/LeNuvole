// Crea gli account veri del portale e, a richiesta, elimina quelli demo.
//
// Account veri:
//   info@lenuvolecasaedesign.it        -> Super User (accesso totale, uno solo)
//   commerciale@lenuvolecasaedesign.it -> Staff
//   interior@lenuvolecasaedesign.it    -> Staff
//
// Nessuna password nel codice né a schermo: per ogni account NUOVO lo script
// stampa un link di primo accesso, a uso singolo e a tempo, che porta la
// persona a scegliere la propria password (stesso meccanismo del QR clienti).
//
// Uso (dalla cartella del progetto, con .env.local compilato, vedi README):
//
//   npm run setup:accounts
//       Crea gli account mancanti e stampa i link di primo accesso.
//       Gli account già esistenti non vengono toccati (nome e password restano).
//
//   npm run setup:accounts -- --links
//       Come sopra, ma stampa un nuovo link di accesso anche per gli account
//       già esistenti (utile se un link è scaduto o non è stato usato).
//
//   npm run setup:accounts -- --delete-demo
//       In più mostra quali account demo verrebbero eliminati, senza toccarli.
//   npm run setup:accounts -- --delete-demo --yes
//       Li elimina davvero. Parte solo se il Super User esiste ed è attivo,
//       così non si resta mai senza un accesso totale.
//
// L'indirizzo usato nei link è APP_URL (default https://lenuvole.onrender.com):
// per provare in locale, APP_URL=http://localhost:3000.

import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = (process.env.APP_URL ?? "https://lenuvole.onrender.com").replace(/\/+$/, "");

if (!url || !serviceRoleKey) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const printAllLinks = args.has("--links");
const deleteDemo = args.has("--delete-demo");
const confirmed = args.has("--yes");

const ACCOUNTS = [
  { email: "info@lenuvolecasaedesign.it", role: "owner", display_name: "Super User" },
  { email: "commerciale@lenuvolecasaedesign.it", role: "staff", display_name: "Commerciale" },
  { email: "interior@lenuvolecasaedesign.it", role: "staff", display_name: "Interior" },
] as const;

// Gli account creati da scripts/seed.ts.
const DEMO_EMAILS = [
  "bea@lenuvolecasaedesign.it",
  "staff.demo@lenuvolecasaedesign.it",
  "cliente.demo@lenuvolecasaedesign.it",
];

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string) {
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

async function accessLink(email: string) {
  const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data) throw error ?? new Error(`Link non generato per ${email}`);
  return `${appUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=${encodeURIComponent("/imposta-password")}`;
}

async function ensureAccount(account: (typeof ACCOUNTS)[number]) {
  let user = await findUserByEmail(account.email);
  let created = false;

  if (!user) {
    // Password casuale mai mostrata: l'accesso avviene dal link di primo accesso.
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error(`Creazione fallita per ${account.email}`);
    user = data.user;
    created = true;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.role === "client") {
    throw new Error(`${account.email} esiste già come CLIENTE del portale: non lo trasformo in staff. Verifica a mano.`);
  }

  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      role: account.role,
      display_name: account.display_name,
      email: account.email,
      active: true,
    });
    if (error) throw error;
  } else {
    // Non si sovrascrive il nome (potrebbe essere stato personalizzato): si
    // riallineano solo livello, email e stato attivo.
    const { error } = await supabase
      .from("profiles")
      .update({ role: account.role, email: account.email, active: true })
      .eq("id", user.id);
    if (error) throw error;
  }

  return { created };
}

async function main() {
  console.log("Account veri...\n");

  const links: { email: string; link: string }[] = [];
  for (const account of ACCOUNTS) {
    const { created } = await ensureAccount(account);
    console.log(`  ${created ? "creato   " : "già presente"}  ${account.email}  (${account.role})`);
    if (created || printAllLinks) {
      links.push({ email: account.email, link: await accessLink(account.email) });
    }
  }

  if (links.length > 0) {
    console.log("\nLink di primo accesso (uso singolo, scadono dopo poco: aprili uno alla volta):\n");
    for (const { email, link } of links) {
      console.log(`  ${email}\n  ${link}\n`);
    }
    console.log("Se un link scade, rilancia con --links per generarne di nuovi.");
  } else {
    console.log("\nNessun nuovo link: gli account esistevano già (usa --links per generarli di nuovo).");
  }

  if (!deleteDemo) {
    console.log("\nGli account demo NON sono stati toccati. Per eliminarli: npm run setup:accounts -- --delete-demo");
    return;
  }

  // Prima di eliminare i demo si verifica che il Super User vero esista ed
  // sia attivo: altrimenti si rischia di restare senza accesso totale.
  const ownerUser = await findUserByEmail(ACCOUNTS[0].email);
  const { data: ownerProfile } = ownerUser
    ? await supabase.from("profiles").select("role, active").eq("id", ownerUser.id).maybeSingle()
    : { data: null };
  if (!ownerProfile || ownerProfile.role !== "owner" || !ownerProfile.active) {
    console.error("\nInterrotto: il Super User info@ non risulta attivo. Non elimino nulla.");
    process.exit(1);
  }

  console.log("\nAccount demo...\n");
  const toDelete: { email: string; id: string }[] = [];
  for (const email of DEMO_EMAILS) {
    const user = await findUserByEmail(email);
    if (user) toDelete.push({ email, id: user.id });
    console.log(`  ${user ? "presente  " : "non trovato"}  ${email}`);
  }

  if (toDelete.length === 0) {
    console.log("\nNessun account demo da eliminare.");
  } else if (!confirmed) {
    console.log("\nSimulazione: non ho eliminato nulla. Aggiungi --yes per eliminarli davvero.");
    console.log("Con gli account spariscono anche i loro messaggi e tempi (cascata sul database).");
  } else {
    for (const { email, id } of toDelete) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      console.log(`  ${error ? `ERRORE (${error.message})` : "eliminato"}  ${email}`);
    }
  }

  const { data: demoProjects } = await supabase.from("projects").select("id, client_label").eq("client_label", "CASA BIZZOTTO");
  if (demoProjects && demoProjects.length > 0) {
    console.log(
      '\nNota: il cantiere demo "CASA BIZZOTTO" esiste ancora e NON è stato toccato. Se è solo di prova, ' +
        'eliminalo dal pannello (Cantieri → Disattiva, poi dalla scheda "Disattivati") con l\'account Super User.',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
