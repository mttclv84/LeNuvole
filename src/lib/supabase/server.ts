import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase per Server Component / Server Function / Route Handler.
// Legge/scrive i cookie di sessione tramite l'API `cookies()` di Next.js.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // set() chiamato da un Server Component: ignorabile se c'è
            // il proxy.ts che rinfresca la sessione ad ogni richiesta.
          }
        },
      },
    },
  );
}
