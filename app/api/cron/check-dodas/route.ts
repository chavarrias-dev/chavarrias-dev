import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

function isAuthorizedCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { checkMonitoredDodas: runCheck } = await import("@/lib/doda-cron");
    const result = await runCheck(supabase);

    console.info("[api/cron/check-dodas]", result);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en cron de DODAs";

    console.error("[api/cron/check-dodas]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
