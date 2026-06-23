import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { validateIntegrationNumbersInput } from "@/lib/doda-sat-details";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type LookupByNumberBody = {
  integration_number?: string;
  cliente_id?: string | null;
  pedimento_id?: string | null;
  notas?: string | null;
  monitor?: boolean;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("No autorizado", 401);
    }

    const actorRole = await getUserRole(supabase, user.id);
    if (actorRole !== "admin" && actorRole !== "empleado") {
      return jsonError("No autorizado", 403);
    }

    let body: LookupByNumberBody;
    try {
      body = (await req.json()) as LookupByNumberBody;
    } catch {
      return jsonError("Cuerpo de solicitud inválido", 400);
    }

    const integrationNumber = body.integration_number?.trim() ?? "";
    const validated = validateIntegrationNumbersInput(integrationNumber, 1);
    if (!validated.ok) {
      return jsonError(validated.error, 400);
    }

    const number = validated.numbers[0]!;
    const isMonitored = Boolean(body.monitor);
    const { runDodaLookupByNumberAndSave } = await import("@/lib/doda-service");

    const { lookup, doda } = await runDodaLookupByNumberAndSave({
      supabase,
      integrationNumber: number,
      clienteId: body.cliente_id ?? null,
      pedimentoId: body.pedimento_id ?? null,
      notas: body.notas ?? null,
      source: isMonitored ? "dashboard_schedule" : "dashboard_number",
      createdBy: user.id,
      isMonitored,
    });

    await logActivity(supabase, {
      userId: user.id,
      userEmail: user.email ?? "",
      action: isMonitored
        ? lookup.lookupStatus === "verificado"
          ? "programó monitoreo DODA por número en SAT"
          : "programó DODA por número para monitoreo (revisión manual)"
        : lookup.lookupStatus === "verificado"
          ? "consultó DODA por número en SAT"
          : "registró DODA por número para revisión manual",
      entityType: "doda",
      entityId: doda.id,
      entityName:
        lookup.numeroIntegracion ??
        lookup.satStatus ??
        `DODA ${doda.id.slice(0, 8)}`,
    });

    return NextResponse.json({
      ok: true,
      doda,
      integrationNumber: number,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al procesar el DODA";

    console.error("[api/doda/lookup-by-number]", error);
    return jsonError(message, 500);
  }
}
