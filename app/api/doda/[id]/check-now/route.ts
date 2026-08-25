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

  const outcome = await performDodaRecheck(supabase, id);

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error },
      { status: outcome.status },
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "consultó DODA ahora",
    entityType: "doda",
    entityId: outcome.doda.id,
    entityName:
      outcome.doda.numero_integracion ?? `DODA ${outcome.doda.id.slice(0, 8)}`,
  });

  return NextResponse.json({
    ok: true,
    doda: outcome.doda,
    previous_status: outcome.previousStatus,
    resolved: outcome.resolved,
  });
}
