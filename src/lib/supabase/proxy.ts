import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CLIENT_HOME = "/dashboard";
const STAFF_HOME = "/staff";
const LOGIN_PATH = "/login";

const CLIENT_PREFIXES = ["/dashboard", "/foto", "/documenti", "/chat", "/impostazioni"];
const STAFF_PREFIX = "/staff";

/**
 * Rinfresca la sessione Supabase su ogni richiesta e applica il routing per ruolo:
 * - non autenticato su rotta protetta -> /login
 * - cliente che prova ad aprire /staff -> CLIENT_HOME
 * - staff/owner che apre le rotte cliente -> STAFF_HOME
 * - staff disattivato dall'owner -> logout forzato
 * - utente autenticato su /login -> redirect alla propria home
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isClientRoute = CLIENT_PREFIXES.some((p) => pathname.startsWith(p));
  const isStaffRoute = pathname.startsWith(STAFF_PREFIX);
  const isProtectedRoute = isClientRoute || isStaffRoute;

  if (!user) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Utente autenticato: recuperiamo ruolo e stato attivo per instradarlo.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.active === false) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("disabled", "1");
    return NextResponse.redirect(url);
  }

  const home = profile.role === "client" ? CLIENT_HOME : STAFF_HOME;

  if (pathname === LOGIN_PATH || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (profile.role === "client" && isStaffRoute) {
    const url = request.nextUrl.clone();
    url.pathname = CLIENT_HOME;
    return NextResponse.redirect(url);
  }

  if (profile.role !== "client" && isClientRoute) {
    const url = request.nextUrl.clone();
    url.pathname = STAFF_HOME;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
