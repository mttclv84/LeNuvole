"use server";

import { revalidatePath } from "next/cache";
import { getClientContext } from "@/lib/data/client-context";

export type AddPaymentState = { error?: string; success?: boolean } | undefined;

// Il cliente auto-dichiara un pagamento fatto (acconto/saldo): non modifica
// né conferma le voci di budget (restano controllate dallo staff), registra
// solo che ha versato una certa cifra in una certa data.
export async function addPayment(_prevState: AddPaymentState, formData: FormData): Promise<AddPaymentState> {
  const { supabase, profile, project } = await getClientContext();

  const type = String(formData.get("type") || "");
  const payment_date = String(formData.get("payment_date") || "");
  const amount = Number(formData.get("amount"));
  const comment = String(formData.get("comment") || "").trim();

  if (type !== "acconto" && type !== "saldo") {
    return { error: "Seleziona il tipo di pagamento." };
  }
  if (!payment_date) {
    return { error: "Inserisci la data del pagamento." };
  }
  if (!amount || amount <= 0) {
    return { error: "Inserisci un importo valido." };
  }

  const { error } = await supabase.from("payments").insert({
    project_id: project.id,
    type,
    amount,
    payment_date,
    comment: comment || null,
    created_by: profile.id,
  });

  if (error) {
    return { error: "Non è stato possibile registrare il pagamento." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/staff/${project.id}`);
  return { success: true };
}
