/**
 * TEMPORARY — remove after confirming email/WhatsApp notifications work.
 * POST { "integrationNumber": "144822281" }
 *
 * Local: no auth required (NODE_ENV=development).
 * Production: Authorization: Bearer {CRON_SECRET}
 */
import { NextResponse } from "next/server";
import { sendDodaResolvedExternalNotifications } from "@/lib/doda-external-notifications";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type TestNotificationBody = {
  integrationNumber?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isAuthorizedForTest(req: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }

  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  if (!isAuthorizedForTest(req)) {
    return jsonError("No autorizado", 401);
  }

  let body: TestNotificationBody;
  try {
    body = (await req.json()) as TestNotificationBody;
  } catch {
    return jsonError("Cuerpo de solicitud inválido", 400);
  }

  const integrationNumber = body.integrationNumber?.trim() ?? "";
  if (!integrationNumber) {
    return jsonError("integrationNumber es requerido", 400);
  }

  const admin = createSupabaseAdminClient();
  const { data: doda, error: fetchError } = await admin
    .from("dodas")
    .select(DODA_RECORD_SELECT)
    .eq("numero_integracion", integrationNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  if (!doda) {
    return jsonError(
      `No se encontró un DODA con número de integración ${integrationNumber}`,
      404,
    );
  }

  const changedAt = new Date().toISOString();
  const newStatus = doda.sat_status?.trim() || "DESADUANAMIENTO LIBRE";
  const previousStatus = "Monitoreo activo (prueba manual)";

  try {
    const result = await sendDodaResolvedExternalNotifications(admin, {
      dodaId: doda.id,
      clienteId: doda.cliente_id,
      createdBy: doda.created_by,
      integrationNumber,
      previousStatus,
      newStatus,
      changedAt,
    });

    await admin
      .from("dodas")
      .update({
        notification_sent_at: result.notification_sent_at,
        notification_error: result.notification_error,
      })
      .eq("id", doda.id);

    return NextResponse.json({
      ok: true,
      test: true,
      dodaId: doda.id,
      integrationNumber,
      previousStatus,
      newStatus,
      notification_sent_at: result.notification_sent_at,
      notification_error: result.notification_error,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar notificaciones";
    console.error("[api/test/send-notification]", error);
    return jsonError(message, 500);
  }
}
