import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

  const { data: updated, error } = await supabase
    .from("dodas")
    .update({ is_monitored: false, is_resolved: false })
    .eq("id", id)
    .select(DODA_RECORD_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "No se pudo cancelar el monitoreo" },
      { status: 500 },
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "canceló monitoreo DODA",
    entityType: "doda",
    entityId: updated.id,
    entityName: updated.numero_integracion ?? `DODA ${updated.id.slice(0, 8)}`,
  });

  return NextResponse.json({ ok: true, doda: updated });
}
