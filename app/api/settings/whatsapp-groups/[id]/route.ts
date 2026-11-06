import { NextResponse } from "next/server";
import {
  countPendingDodasForGroupId,
  getWhatsappGroupById,
  isValidWhatsappGroupIdFormat,
  normalizeWhatsappGroupIdForStorage,
} from "@/lib/whatsapp-groups";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  name?: string;
  group_id?: string;
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
    updates.group_id = normalizeWhatsappGroupIdForStorage(rawGroupId);
  }

  const { data, error } = await admin
    .from("whatsapp_groups")
    .update(updates)
    .eq("id", id)
    .select("id, name, group_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("Ya existe un grupo con ese ID de WhatsApp", 409);
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true, group: data });
}

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
    return jsonError("Solo administradores pueden eliminar grupos", 403);
  }

  const admin = createSupabaseAdminClient();
  const existing = await getWhatsappGroupById(admin, id);
  if (!existing) {
    return jsonError("Grupo no encontrado", 404);
  }

  const pending = await countPendingDodasForGroupId(admin, existing.group_id);
  if (pending > 0) {
    return jsonError(
      `No se puede eliminar: hay ${pending} DODA(s) pendientes notificando a este grupo. Cambia la notificación o resuélvelos antes.`,
      409,
    );
  }

  const { error } = await admin.from("whatsapp_groups").delete().eq("id", id);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
