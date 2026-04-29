import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type ProfileRole = "admin" | "empleado" | "cliente";

/**
 * Loads the user's role from `profiles`. Returns null if missing or on error.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: ProfileRole | null }>();

  if (error || data?.role == null) {
    return null;
  }
  return data.role;
}

function isStaffRole(role: ProfileRole | null): boolean {
  return role === "admin" || role === "empleado";
}

function clienteForbiddenPath(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/tools")) return true;
  if (pathname.startsWith("/dashboard/clients")) return true;
  if (pathname === "/dashboard/facturas/new") return true;
  if (/^\/dashboard\/facturas\/[^/]+\/edit$/.test(pathname)) return true;
  if (pathname === "/dashboard/pedimentos/new") return true;
  return false;
}

/**
 * Apply cookies set during session refresh to a new response.
 * If we return a bare redirect(), refreshed auth cookies are dropped and the
 * next request can look unauthenticated.
 */
function applyResponseCookies(
  to: NextResponse,
  from: NextResponse,
) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not add logic between createServerClient and getUser (Supabase / Next guidance).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login";
  const isDashboardPath = pathname.startsWith("/dashboard");

  if (!user && isDashboardPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    const redirect = NextResponse.redirect(url);
    applyResponseCookies(redirect, supabaseResponse);
    return redirect;
  }

  if (user && isDashboardPath) {
    if (pathname === "/dashboard/clients/new") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/users/new";
      const redirectClientsNew = NextResponse.redirect(url);
      applyResponseCookies(redirectClientsNew, supabaseResponse);
      return redirectClientsNew;
    }

    const role = await getUserRole(supabase, user.id);

    if (pathname.startsWith("/dashboard/users") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      const redirect = NextResponse.redirect(url);
      applyResponseCookies(redirect, supabaseResponse);
      return redirect;
    }

    if (!isStaffRole(role) && clienteForbiddenPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      const redirect = NextResponse.redirect(url);
      applyResponseCookies(redirect, supabaseResponse);
      return redirect;
    }
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    applyResponseCookies(redirect, supabaseResponse);
    return redirect;
  }

  return supabaseResponse;
}
