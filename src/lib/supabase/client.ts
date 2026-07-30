"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client Supabase per componenti browser ("use client").
// Usa la anon key: è protetto dalle policy RLS definite in supabase/migrations.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
