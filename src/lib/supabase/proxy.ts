import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CLIENT_HOME = "/dashboard";
const STAFF_HOME = "/staff";
const LOGIN_PATH = "/login";
const NO_PROJECT_PATH = "/nessun-cantiere";

const CLIENT_PREFIXES = ["/dashboard", "/foto", "/documenti", "/chat", "/impostazioni"];
const STAFF_PREFIX = "/staff";

/**
 * Rinfresca la sessione Supabase su ogni richiesta e applica il routing per ruolo:
 * - non autenticato su rotta protetta -> /login
 * - cliente che prova ad aprire /staff -> CLIENT_HOME (o NO_PROJECT_PATH se non ha ancora un cantiere)
 * - staff/owner che apre le rotte cliente -> STAFF_HOME
 * - cliente registrato ma senza cantiere abbinato -> NO_PROJECT_PATH invece del dashboard
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
  const isNoProjectRoute = pathname === NO_PROJECT_PATH;
  const isProtectedRoute = isClientRoute || isStaffRoute || isNoProjectRoute;

  if (!user) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Utente autenticato: recuperiamo ruolo, stato attivo e cantiere per instradarlo.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active, project_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.active === false) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("disabled", "1");
    return NextResponse.redirect(url);
  }

  const isClientWithoutProject = profile.role === "client" && !profile.project_id;
  const home = profile.role !== "client" ? STAFF_HOME : isClientWithoutProject ? NO_PROJECT_PATH : CLIENT_HOME;

  if (pathname === LOGIN_PATH || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (profile.role === "client" && isStaffRoute) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  if (profile.role !== "client" && (isClientRoute || isNoProjectRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = STAFF_HOME;
    return NextResponse.redirect(url);
  }

  if (profile.role === "client" && isClientRoute && isClientWithoutProject) {
    const url = request.nextUrl.clone();
    url.pathname = NO_PROJECT_PATH;
    return NextResponse.redirect(url);
  }

  if (profile.role === "client" && isNoProjectRoute && !isClientWithoutProject) {
    const url = request.nextUrl.clone();
    url.pathname = CLIENT_HOME;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
