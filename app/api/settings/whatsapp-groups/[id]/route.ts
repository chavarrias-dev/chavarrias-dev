import { NextResponse } from "next/server";
import {
  duplicateGroupMessage,
  findWhatsappGroupByNormalizedId,
  getWhatsappGroupById,
  isValidWhatsappGroupIdFormat,
  listPendingDodasForGroupId,
  normalizeWhatsappGroupIdForStorage,
  reassignPendingDodasAndDeleteGroup,
} from "@/lib/whatsapp-groups";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  name?: string;
  group_id?: string;
};

type DeleteBody = {
  reassign_to_group_row_id?: string;
};

function formatPendingDeleteMessage(
  pending: Array<{ id: string; numero_integracion: string | null }>,
): string {
  const labels = pending.map(
    (doda) => doda.numero_integracion?.trim() || doda.id.slice(0, 8),
  );
  const listed = labels.slice(0, 8).join(", ");
  const more =
    labels.length > 8 ? ` y ${labels.length - 8} más` : "";
  return `No se puede eliminar: hay ${pending.length} DODA(s) pendientes notificando a este grupo (${listed}${more}). Reasigna a otro grupo o resuélvelos antes.`;
}

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
  if (role !== "admin") {
    return jsonError("Solo administradores pueden editar grupos", 403);
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const name = body.name?.trim();
  const rawGroupId = body.group_id?.trim();

  if (name === undefined && rawGroupId === undefined) {
    return jsonError("No hay cambios que guardar", 400);
  }

  if (rawGroupId !== undefined && rawGroupId.length > 0) {
    if (!isValidWhatsappGroupIdFormat(rawGroupId)) {
      return jsonError(
        "El ID debe ser solo dígitos (mínimo 8), opcionalmente terminando en @g.us",
        400,
      );
    }
  }

  const admin = createSupabaseAdminClient();
  const existing = await getWhatsappGroupById(admin, id);
  if (!existing) {
    return jsonError("Grupo no encontrado", 404);
  }

  const updates: { name?: string; group_id?: string } = {};
  if (name !== undefined) {
    if (!name) {
      return jsonError("Ingresa el nombre del grupo", 400);
    }
    updates.name = name;
  }
  if (rawGroupId !== undefined) {
    if (!rawGroupId) {
      return jsonError("Ingresa el ID del grupo", 400);
    }
    const groupId = normalizeWhatsappGroupIdForStorage(rawGroupId);
    const conflict = await findWhatsappGroupByNormalizedId(admin, groupId, id);
    if (conflict) {
      return jsonError(duplicateGroupMessage(conflict.name), 409);
    }
    updates.group_id = groupId;
  }

  const { data, error } = await admin
    .from("whatsapp_groups")
    .update(updates)
    .eq("id", id)
    .select("id, name, group_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const conflictId = updates.group_id ?? existing.group_id;
      const again = await findWhatsappGroupByNormalizedId(
        admin,
        conflictId,
        id,
      );
      return jsonError(
        duplicateGroupMessage(again?.name ?? existing.name),
        409,
      );
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true, group: data });
}

export async function DELETE(req: Request, context: RouteContext) {
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
    return jsonError("Solo administradores pueden eliminar grupos", 403);
  }

  let body: DeleteBody = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text) as DeleteBody;
    }
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const admin = createSupabaseAdminClient();
  const existing = await getWhatsappGroupById(admin, id);
  if (!existing) {
    return jsonError("Grupo no encontrado", 404);
  }

  const pending = await listPendingDodasForGroupId(admin, existing.group_id);
  const reassignTo = body.reassign_to_group_row_id?.trim() ?? "";

  if (pending.length > 0 && !reassignTo) {
    return jsonError(formatPendingDeleteMessage(pending), 409, {
      code: "PENDING_DODAS",
      pending_count: pending.length,
      pending,
    });
  }

  if (pending.length > 0 && reassignTo) {
    if (reassignTo === id) {
      return jsonError("Elige un grupo distinto para reasignar", 400);
    }
    const target = await getWhatsappGroupById(admin, reassignTo);
    if (!target) {
      return jsonError("El grupo de destino no existe", 404);
    }
    const targetCanon = normalizeWhatsappGroupIdForStorage(target.group_id);
    try {
      await reassignPendingDodasAndDeleteGroup({
        deleteRowId: id,
        fromGroupIdStored: existing.group_id,
        toGroupIdStored: targetCanon,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo reasignar y eliminar";
      return jsonError(message, 500);
    }
    return NextResponse.json({
      ok: true,
      reassigned: pending.length,
      to_group_id: targetCanon,
    });
  }

  const { error } = await admin.from("whatsapp_groups").delete().eq("id", id);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
