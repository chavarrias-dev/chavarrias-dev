import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { performDodaRecheck } from "@/lib/doda-service";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const startedAt = Date.now();
  console.log("[check-now] request received", { dodaId: id });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[check-now] rejected: no authenticated user", { dodaId: id });
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    console.warn("[check-now] rejected: insufficient role", { dodaId: id, role });
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  try {
    console.log("[check-now] starting SAT recheck", {
      dodaId: id,
      userEmail: user.email,
    });

    const outcome = await performDodaRecheck(supabase, id);

    if (!outcome.ok) {
      console.error("[check-now] recheck returned an error", {
        dodaId: id,
        status: outcome.status,
        error: outcome.error,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: outcome.error },
        { status: outcome.status },
      );
    }

    const checkFailed = outcome.lookupStatus !== "verificado";
    console.log("[check-now] recheck complete", {
      dodaId: id,
      numeroIntegracion: outcome.doda.numero_integracion,
      previousStatus: outcome.previousStatus,
      satStatus: outcome.doda.sat_status,
      lookupStatus: outcome.lookupStatus,
      resolved: outcome.resolved,
      checkFailed,
      lookupError: outcome.lookupError,
      checkCount: outcome.doda.check_count,
      elapsedMs: Date.now() - startedAt,
    });

    // A logging failure must never turn a successful recheck into a 500.
    try {
      await logActivity(supabase, {
        userId: user.id,
        userEmail: user.email ?? "",
        action: "consultó DODA ahora",
        entityType: "doda",
        entityId: outcome.doda.id,
        entityName:
          outcome.doda.numero_integracion ?? `DODA ${outcome.doda.id.slice(0, 8)}`,
      });
    } catch (logError) {
      console.error("[check-now] logActivity failed (non-fatal)", {
        dodaId: id,
        logError,
      });
    }

    return NextResponse.json({
      ok: true,
      doda: outcome.doda,
      previous_status: outcome.previousStatus,
      resolved: outcome.resolved,
      check_failed: checkFailed,
      lookup_error: outcome.lookupError,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado al consultar el DODA";
    console.error("[check-now] unhandled exception", {
      dodaId: id,
      error,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
