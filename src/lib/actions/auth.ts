"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/data/log-event";

export async function logout() {
  const supabase = await createClient();
  await logEvent(supabase, "logout");
  await supabase.auth.signOut();
  redirect("/login");
}

export type ChangePasswordState = { error?: string; success?: boolean } | undefined;

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }
  if (password !== confirm) {
    return { error: "Le due password non coincidono." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Non è stato possibile aggiornare la password." };
  }

  // Password temporanea sostituita: si toglie l'obbligo di cambiarla.
  // app_metadata è modificabile solo con la chiave di servizio.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logEvent(supabase, "password_changed");
  if (user?.app_metadata?.must_change_password) {
    await createAdminClient().auth.admin.updateUserById(user.id, {
      app_metadata: { must_change_password: false },
    });
  }
  return { success: true };
}
