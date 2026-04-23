import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
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

  const isAuthPage = request.nextUrl.pathname === "/login";
  const isDashboardPath = request.nextUrl.pathname.startsWith("/dashboard");

  if (!user && isDashboardPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    applyResponseCookies(redirect, supabaseResponse);
    return redirect;
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
