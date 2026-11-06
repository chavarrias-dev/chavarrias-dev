import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { parseDodaBatchNotifySettings } from "@/lib/doda-notification-config";
import { DODA_RECORD_SELECT } from "@/lib/doda-types";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  notify_type?: string | null;
  notify_whatsapp_number?: string | null;
  notify_whatsapp_group_id?: string | null;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("No autorizado", 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    return jsonError("No autorizado", 403);
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const { data: existing, error: loadError } = await supabase
    .from("dodas")
    .select("id, is_resolved, numero_integracion")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return jsonError(loadError?.message ?? "DODA no encontrado", 404);
  }

  if (existing.is_resolved) {
    return jsonError(
      "Este DODA ya está resuelto; no se puede cambiar la notificación.",
      400,
    );
  }

  const rawType = body.notify_type?.trim() ?? "";
  if (
    rawType === "" ||
    rawType === "none" ||
    rawType === "null" ||
    rawType === "ninguna"
  ) {
    const { data: cleared, error: clearError } = await supabase
      .from("dodas")
      .update({
        notify_type: null,
        notify_whatsapp_number: null,
        notify_whatsapp_group_id: null,
      })
      .eq("id", id)
      .eq("is_resolved", false)
      .select(DODA_RECORD_SELECT)
      .maybeSingle();

    if (clearError) {
      return jsonError(clearError.message, 500);
    }
    if (!cleared) {
      return jsonError(
        "No se pudo actualizar (¿el DODA ya estaba resuelto?)",
        409,
      );
    }

    await logActivity(supabase, {
      userId: user.id,
      userEmail: user.email ?? "",
      action: "quitó notificación WhatsApp del DODA",
      entityType: "doda",
      entityId: cleared.id,
      entityName:
        cleared.numero_integracion ?? `DODA ${cleared.id.slice(0, 8)}`,
    });

    return NextResponse.json({ ok: true, doda: cleared });
  }

  let batchNotify;
  try {
    batchNotify = await parseDodaBatchNotifySettings(supabase, {
      notify_type: body.notify_type,
      notify_whatsapp_number: body.notify_whatsapp_number,
      notify_whatsapp_group_id: body.notify_whatsapp_group_id,
    });
  } catch (notifyErr) {
    const msg =
      notifyErr instanceof Error
        ? notifyErr.message
        : "Configuración de notificación inválida";
    return jsonError(msg, 400);
  }

  const updates: {
    notify_type: string | null;
    notify_whatsapp_number: string | null;
    notify_whatsapp_group_id: string | null;
  } = {
    notify_type: batchNotify.notify_type,
    notify_whatsapp_number: batchNotify.notify_whatsapp_number,
    notify_whatsapp_group_id: batchNotify.notify_whatsapp_group_id,
  };

  const { data: updated, error: updateError } = await supabase
    .from("dodas")
    .update(updates)
    .eq("id", id)
    .eq("is_resolved", false)
    .select(DODA_RECORD_SELECT)
    .maybeSingle();

  if (updateError) {
    return jsonError(updateError.message, 500);
  }
  if (!updated) {
    return jsonError(
      "No se pudo actualizar (¿el DODA ya estaba resuelto?)",
      409,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "actualizó destino de notificación DODA",
    entityType: "doda",
    entityId: updated.id,
    entityName:
      updated.numero_integracion ?? `DODA ${updated.id.slice(0, 8)}`,
  });

  return NextResponse.json({ ok: true, doda: updated });
}
