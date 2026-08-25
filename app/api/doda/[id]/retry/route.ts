import { NextResponse } from "next/server";
import { isDodaResolvedSatStatus } from "@/lib/doda-monitoring-constants";
import { processDodaSatRecheck } from "@/lib/doda-sat-recheck";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import { notifyStaffDodaMonitoringComplete } from "@/lib/notifications";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const { data: doda, error: fetchError } = await supabase
    .from("dodas")
    .select(DODA_RECORD_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }

  if (!doda) {
    return NextResponse.json({ ok: false, error: "DODA no encontrado" }, { status: 404 });
  }

  if (!doda.qr_validator_url) {
    return NextResponse.json(
      { ok: false, error: "Este DODA no tiene URL del validador SAT." },
      { status: 400 },
    );
  }

  try {
    const previousStatus = doda.sat_status;
    const recheck = await processDodaSatRecheck(doda.qr_validator_url);
    const checkedAt = recheck.lookedUpAt;
    const nextCheckCount = (doda.check_count ?? 0) + 1;
    const resolved =
      recheck.lookupStatus === "verificado" &&
      isDodaResolvedSatStatus(recheck.satStatus);

    const { data: updated, error: updateError } = await supabase
      .from("dodas")
      .update({
        last_checked_at: checkedAt,
        looked_up_at: checkedAt,
        check_count: nextCheckCount,
        ...(recheck.lookupStatus === "verificado" && recheck.satStatus
          ? {
              sat_status: recheck.satStatus,
              sat_details: recheck.satDetails
                ? JSON.stringify(recheck.satDetails)
                : null,
              tipo_pedimento: recheck.pedimentoInfo?.tipoPedimento ?? null,
              pedimento: recheck.pedimentoInfo?.pedimento ?? null,
              remesas_presentadas:
                recheck.pedimentoInfo?.remesasPresentadas ?? null,
              clave_pedimento: recheck.pedimentoInfo?.clavePedimento ?? null,
              datos_vehiculo: recheck.pedimentoInfo?.datosVehiculo ?? null,
              cantidad_mercancia:
                recheck.pedimentoInfo?.cantidadMercancia ?? null,
              numero_integracion:
                recheck.numeroIntegracion ?? doda.numero_integracion,
              lookup_status: "verificado",
              lookup_error: null,
            }
          : {
              lookup_status: "revision_manual",
              lookup_error: recheck.lookupError,
            }),
        ...(resolved
          ? {
              is_monitored: false,
              is_resolved: true,
            }
          : {}),
      })
      .eq("id", id)
      .select(DODA_RECORD_SELECT)
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { ok: false, error: updateError?.message ?? "No se pudo actualizar el DODA" },
        { status: 500 },
      );
    }

    if (resolved && recheck.satStatus) {
      await notifyStaffDodaMonitoringComplete(supabase, {
        dodaId: id,
        numeroIntegracion: recheck.numeroIntegracion ?? doda.numero_integracion,
        satStatus: recheck.satStatus,
      });
    }

    return NextResponse.json({
      ok: true,
      doda: updated,
      previous_status: previousStatus,
      resolved,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al reintentar consulta SAT";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
