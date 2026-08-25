import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Do NOT include /api/* here — API routes (e.g. the WhatsApp webhook) handle their own auth.
  matcher: ["/login", "/dashboard/:path*", "/auth/:path*"],
};
