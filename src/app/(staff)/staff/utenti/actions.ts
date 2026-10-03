"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, requireAllowed } from "@/lib/data/staff-context";
import { permissions } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type Admin = ReturnType<typeof createAdminClient>;

// Il livello dell'account bersaglio si legge dal database, mai dal form: il form si può manomettere.
async function getTargetRole(admin: Admin, id: string): Promise<UserRole | null> {
  const { data } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  return (data?.role as UserRole | undefined) ?? null;
}

export type CreateAccountState = { error?: string; success?: boolean } | undefined;

// Solo il Super User crea account per il pannello, sempre di livello Staff
// (il Super User è uno solo). L'anagrafica clienti è una cosa separata, vedi
// staff/clienti/actions.ts.
export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const { profile } = await getStaffContext();
  requireAllowed(permissions.accessUsersPage(profile.role));

  const email = str(formData, "email");
  const password = str(formData, "password");
  const display_name = str(formData, "display_name");

  if (!email || !password || !display_name) {
    return { error: "Compila tutti i campi." };
  }
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return { error: "Impossibile creare l'utente (email già in uso?)." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "staff",
    display_name,
    email,
  });
  if (profileError) {
    return { error: "Utente creato ma il profilo non è stato salvato: contattare l'assistenza." };
  }

  revalidatePath("/staff/utenti");
  return { success: true };
}

export type UpdateAccountState = { error?: string; success?: boolean } | undefined;

// Il Super User corregge nome ed email degli account. Il livello non si
// cambia da qui. La password NON è mai leggibile (è salvata cifrata,
// irreversibile per chiunque): qui si può solo impostarne una nuova, non
// vedere/confermare quella esistente.
export async function updateAccount(
  _prevState: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const { profile } = await getStaffContext();
  requireAllowed(permissions.accessUsersPage(profile.role));

  const id = str(formData, "id");
  const display_name = str(formData, "display_name");
  const email = str(formData, "email");
  const new_password = str(formData, "new_password");

  if (!display_name || !email) {
    return { error: "Nome visualizzato ed email sono obbligatori." };
  }
  if (new_password && new_password.length < 8) {
    return { error: "La nuova password deve avere almeno 8 caratteri." };
  }

  const admin = createAdminClient();
  const targetRole = await getTargetRole(admin, id);
  if (!targetRole || !permissions.canManageAccount(profile.role, targetRole)) {
    return { error: "Non hai i permessi per modificare questo account." };
  }

  const authUpdate: { email?: string; password?: string; email_confirm?: boolean } = {
    email,
    email_confirm: true,
  };
  if (new_password) authUpdate.password = new_password;

  const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authError) {
    return { error: "Impossibile aggiornare le credenziali di accesso (email già in uso?)." };
  }

  const { error } = await admin.from("profiles").update({ display_name, email }).eq("id", id);
  if (error) {
    return { error: "Non è stato possibile salvare le modifiche." };
  }

  revalidatePath("/staff/utenti");
  return { success: true };
}

export async function toggleActive(formData: FormData) {
  const { profile } = await getStaffContext();
  requireAllowed(permissions.accessUsersPage(profile.role));

  const supabase = await createClient();
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";

  // Nessuno può bloccare se stesso.
  if (id === profile.id) return;

  await supabase.from("profiles").update({ active }).eq("id", id);
  revalidatePath("/staff/utenti");
}

// Eliminazione definitiva di un account Staff. Non reversibile: con l'account
// spariscono anche i suoi tempi registrati e i messaggi che ha scritto nelle
// chat dei cantieri (le relazioni sul database sono "on delete cascade").
// Per un collega vero è quasi sempre meglio "Disattiva". Mai su se stessi,
// sul Super User o sui clienti (quelli si gestiscono da "Clienti").
export async function deleteAccount(formData: FormData) {
  const { profile } = await getStaffContext();
  requireAllowed(permissions.deleteForever(profile.role));

  const id = str(formData, "id");
  if (id === profile.id) return;

  const admin = createAdminClient();
  const targetRole = await getTargetRole(admin, id);
  if (targetRole !== "staff") return;

  await admin.auth.admin.deleteUser(id);
  revalidatePath("/staff/utenti");
}
