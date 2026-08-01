"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/data/staff-context";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type CreateClientState = { error?: string; success?: boolean } | undefined;

// Anagrafica cliente (CRM essenziale) + account di accesso al portale.
// Aperta a tutto lo staff (non solo al Super User): è lavoro operativo
// quotidiano, a differenza della gestione account in Utenti.
export async function createClientRecord(
  _prevState: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  await getStaffContext();

  const first_name = str(formData, "first_name");
  const last_name = str(formData, "last_name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  const phone = str(formData, "phone");
  const address = str(formData, "address");
  const project_id = str(formData, "project_id");
  const notes = str(formData, "notes");

  if (!first_name || !last_name || !email || !password) {
    return { error: "Nome, cognome, email e password sono obbligatori." };
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
    return { error: "Impossibile creare l'account (email già in uso?)." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "client",
    display_name: `${first_name} ${last_name}`.trim(),
    first_name,
    last_name,
    email,
    phone: phone || null,
    address: address || null,
    notes: notes || null,
    project_id: project_id || null,
  });
  if (profileError) {
    return { error: "Account creato ma la scheda cliente non è stata salvata: contattare l'assistenza." };
  }

  revalidatePath("/staff/clienti");
  return { success: true };
}

export type UpdateClientState = { error?: string; success?: boolean } | undefined;

// Modifica l'anagrafica, l'email e — se richiesto — la password del
// cliente. La password esistente non è mai leggibile (salvata cifrata,
// irreversibile): qui si può solo impostarne una nuova.
export async function updateClientRecord(
  _prevState: UpdateClientState,
  formData: FormData,
): Promise<UpdateClientState> {
  await getStaffContext();

  const id = str(formData, "id");
  const first_name = str(formData, "first_name");
  const last_name = str(formData, "last_name");
  const email = str(formData, "email");
  const new_password = str(formData, "new_password");
  const phone = str(formData, "phone");
  const address = str(formData, "address");
  const project_id = str(formData, "project_id");
  const notes = str(formData, "notes");

  if (!first_name || !last_name || !email) {
    return { error: "Nome, cognome ed email sono obbligatori." };
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

  const { error } = await admin
    .from("profiles")
    .update({
      first_name,
      last_name,
      display_name: `${first_name} ${last_name}`.trim(),
      email,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      project_id: project_id || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Non è stato possibile salvare le modifiche." };
  }

  revalidatePath("/staff/clienti");
  return { success: true };
}

export async function toggleClientActive(formData: FormData) {
  await getStaffContext();
  const supabase = await createSupabaseServerClient();
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";

  await supabase.from("profiles").update({ active }).eq("id", id);
  revalidatePath("/staff/clienti");
}
