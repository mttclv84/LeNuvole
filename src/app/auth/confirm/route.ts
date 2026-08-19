import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Riceve i link generati da admin.generateLink (vedi staff/clienti/actions.ts
// e "password dimenticata" se in futuro verrà aggiunta): verifica il
// token_hash con l'API OTP di Supabase, che stabilisce la sessione tramite
// i cookie del client server-side, poi porta l'utente alla pagina indicata.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?link_error=1");
}
