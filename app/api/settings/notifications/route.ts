import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PREFERENCE_KEYS = [
  "notif_push_enabled",
  "notif_doda_alert",
  "notif_docs_alert",
  "notif_messages_alert",
] as const;

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const update: Record<string, boolean> = {};
  for (const key of PREFERENCE_KEYS) {
    if (typeof body[key] === "boolean") {
      update[key] = body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nada que actualizar" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
