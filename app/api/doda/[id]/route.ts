import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Borrado permanente del registro DODA (solo admin). */
export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("No autorizado", 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return jsonError("Solo administradores pueden eliminar un DODA", 403);
  }

  const { data: row, error: fetchError } = await supabase
    .from("dodas")
    .select("id, numero_integracion")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) {
    return jsonError(fetchError?.message ?? "DODA no encontrado", 404);
  }

  const admin = createSupabaseAdminClient();
  const { error: delError } = await admin.from("dodas").delete().eq("id", id);

  if (delError) {
    return jsonError(delError.message, 500);
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó registro DODA del CRM",
    entityType: "doda",
    entityId: id,
    entityName:
      row.numero_integracion ?? `DODA ${id.slice(0, 8)}`,
  });

  return NextResponse.json({ ok: true });
}
