import { NextResponse } from "next/server";
import {
  findWhatsappGroupByNormalizedId,
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

type ImportBody = {
  items?: Array<{ id?: string; subject?: string }>;
};

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
    return jsonError("Solo administradores pueden importar grupos", 403);
  }

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return jsonError("Selecciona al menos un grupo para importar", 400);
  }

  const admin = createSupabaseAdminClient();
  const inserted: Array<{
    id: string;
    name: string;
    group_id: string;
    created_at: string | null;
  }> = [];
  let skippedDuplicate = 0;
  let skippedInvalid = 0;
  const alreadyRegistered: Array<{ name: string; group_id: string }> = [];

  for (const item of items) {
    const rawId = item.id?.trim() ?? "";
    const subject = item.subject?.trim() ?? "";
    if (!rawId) {
      skippedInvalid += 1;
      continue;
    }
    const name = subject || "Sin nombre";

    if (!isValidWhatsappGroupIdFormat(rawId)) {
      skippedInvalid += 1;
      continue;
    }

    const groupId = normalizeWhatsappGroupIdForStorage(rawId);

    const existing = await findWhatsappGroupByNormalizedId(admin, groupId);
    if (existing) {
      skippedDuplicate += 1;
      alreadyRegistered.push({
        name: existing.name,
        group_id: existing.group_id,
      });
      continue;
    }

    const { data: row, error } = await admin
      .from("whatsapp_groups")
      .insert({ name, group_id: groupId })
      .select("id, name, group_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        skippedDuplicate += 1;
        const again = await findWhatsappGroupByNormalizedId(admin, groupId);
        if (again) {
          alreadyRegistered.push({
            name: again.name,
            group_id: again.group_id,
          });
        }
        continue;
      }
      return jsonError(error.message, 500);
    }
    if (row) {
      inserted.push(row as (typeof inserted)[0]);
    }
  }

  return NextResponse.json({
    ok: true,
    imported: inserted.length,
    skipped_duplicate: skippedDuplicate,
    skipped_invalid: skippedInvalid,
    already_registered: alreadyRegistered,
    groups: inserted,
  });
}
