import { NextResponse } from "next/server";
import {
  duplicateGroupMessage,
  findWhatsappGroupByNormalizedId,
  isValidWhatsappGroupIdFormat,
  listWhatsappGroups,
  normalizeWhatsappGroupIdForStorage,
} from "@/lib/whatsapp-groups";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type PostBody = {
  name?: string;
  group_id?: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("No autorizado", 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return jsonError("No autorizado", 403);
  }

  const admin = createSupabaseAdminClient();
  const { rows, error } = await listWhatsappGroups(admin);
  if (error) {
    return jsonError(error, 500);
  }

  return NextResponse.json({ ok: true, groups: rows });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("No autorizado", 401);
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return jsonError("Solo administradores pueden administrar grupos", 403);
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const name = body.name?.trim() ?? "";
  const rawGroupId = body.group_id?.trim() ?? "";

  if (!name) {
    return jsonError("Ingresa el nombre del grupo", 400);
  }
  if (!rawGroupId) {
    return jsonError("Ingresa el ID del grupo", 400);
  }

  if (!isValidWhatsappGroupIdFormat(rawGroupId)) {
    return jsonError(
      "El ID debe ser solo dígitos (mínimo 8), opcionalmente terminando en @g.us",
      400,
    );
  }

  const groupId = normalizeWhatsappGroupIdForStorage(rawGroupId);
  const admin = createSupabaseAdminClient();

  const existing = await findWhatsappGroupByNormalizedId(admin, groupId);
  if (existing) {
    return jsonError(duplicateGroupMessage(existing.name), 409);
  }

  const { data, error } = await admin
    .from("whatsapp_groups")
    .insert({ name, group_id: groupId })
    .select("id, name, group_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const again = await findWhatsappGroupByNormalizedId(admin, groupId);
      return jsonError(
        duplicateGroupMessage(again?.name ?? name),
        409,
      );
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true, group: data });
}
