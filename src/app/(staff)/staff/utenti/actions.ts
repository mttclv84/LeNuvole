"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, requireOwner } from "@/lib/data/staff-context";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type CreateAccountState = { error?: string; success?: boolean } | undefined;

// Solo il Super User crea account per il pannello (Staff o altro Super
// User). L'anagrafica clienti è una cosa separata, vedi staff/clienti/actions.ts.
export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const { profile } = await getStaffContext();
  await requireOwner(profile);

  const email = str(formData, "email");
  const password = str(formData, "password");
  const display_name = str(formData, "display_name");
  const role = str(formData, "role") as "staff" | "owner";

  if (!email || !password || !display_name) {
    return { error: "Compila tutti i campi." };
  }
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }
  if (role !== "staff" && role !== "owner") {
    return { error: "Seleziona un livello valido." };
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
    role,
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

// Il Super User può correggere nome, email e livello di qualsiasi account,
// inclusi altri Super User. La password NON è mai leggibile (è salvata
// cifrata, irreversibile per chiunque): qui si può solo impostarne una
// nuova, non vedere/confermare quella esistente.
export async function updateAccount(
  _prevState: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const { profile } = await getStaffContext();
  await requireOwner(profile);

  const id = str(formData, "id");
  const display_name = str(formData, "display_name");
  const role = str(formData, "role") as "staff" | "owner";
  const email = str(formData, "email");
  const new_password = str(formData, "new_password");

  if (!display_name || !email) {
    return { error: "Nome visualizzato ed email sono obbligatori." };
  }
  if (role !== "staff" && role !== "owner") {
    return { error: "Seleziona un livello valido." };
  }
  if (new_password && new_password.length < 8) {
    return { error: "La nuova password deve avere almeno 8 caratteri." };
  }

  const admin = createAdminClient();

  const authUpdate: { email?: string; password?: string; email_confirm?: boolean } = {
    email,
    email_confirm: true,
  };
  if (new_password) authUpdate.password = new_password;

  const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authError) {
    return { error: "Impossibile aggiornare le credenziali di accesso (email già in uso?)." };
  }

  const { error } = await admin.from("profiles").update({ display_name, role, email }).eq("id", id);
  if (error) {
    return { error: "Non è stato possibile salvare le modifiche." };
  }

  revalidatePath("/staff/utenti");
  return { success: true };
}

export async function toggleActive(formData: FormData) {
  const { profile } = await getStaffContext();
  await requireOwner(profile);

  const supabase = await createClient();
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";

  // L'owner non può bloccare se stesso.
  if (id === profile.id) return;

  await supabase.from("profiles").update({ active }).eq("id", id);
  revalidatePath("/staff/utenti");
}
