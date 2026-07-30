"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, requireOwner } from "@/lib/data/staff-context";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type CreateAccountState = { error?: string; success?: boolean } | undefined;

// Solo l'owner crea account: sia staff interno, sia clienti (associati a un
// progetto). Niente autoregistrazione: coerente con "i documenti li carichiamo
// noi" e con l'esigenza di isolare ogni cliente sul proprio cantiere.
export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const { profile } = await getStaffContext();
  await requireOwner(profile);

  const email = str(formData, "email");
  const password = str(formData, "password");
  const display_name = str(formData, "display_name");
  const role = str(formData, "role") as "staff" | "client";
  const project_id = str(formData, "project_id");

  if (!email || !password || !display_name) {
    return { error: "Compila tutti i campi." };
  }
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }
  if (role === "client" && !project_id) {
    return { error: "Seleziona il cantiere da associare al cliente." };
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
    project_id: role === "client" ? project_id : null,
  });
  if (profileError) {
    return { error: "Utente creato ma il profilo non è stato salvato: contattare l'assistenza." };
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
