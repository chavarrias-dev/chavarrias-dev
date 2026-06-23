/**
 * Automated DODA monitoring cron (external scheduler, Vercel free tier ~10s limit).
 *
 * Set up a free cron job at https://cron-job.org to call this URL every 5 minutes:
 *   https://yourdomain.vercel.app/api/doda/cron
 *
 * Request:
 *   Method: GET
 *   Header: Authorization: Bearer {CRON_SECRET}
 *
 * Add CRON_SECRET to .env locally and to Vercel Project Settings → Environment Variables.
 * Each run processes up to 5 monitored DODAs (oldest last_checked_at first).
 */
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
/** Vercel Hobby plan serverless limit is 10 seconds. */
export const maxDuration = 10;

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { processMonitoredDodasBatch } = await import("@/lib/doda-cron");
    const { processed, results } = await processMonitoredDodasBatch(supabase);

    console.info("[api/doda/cron]", { processed, completed: results.filter((r) => r.completed).length });

    return NextResponse.json({ ok: true, processed, results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en cron de DODAs";

    console.error("[api/doda/cron]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
