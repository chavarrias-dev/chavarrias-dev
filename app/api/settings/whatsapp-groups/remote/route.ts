import { NextResponse } from "next/server";
import { fetchEvolutionGroups } from "@/lib/evolution-whatsapp";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

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
    return jsonError("Solo administradores pueden importar grupos desde WhatsApp", 403);
  }

  try {
    const groups = await fetchEvolutionGroups();
    return NextResponse.json({ ok: true, groups });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron obtener los grupos desde Evolution API.";
    console.error("[api/settings/whatsapp-groups/remote]", error);
    return jsonError(message, 502);
  }
}
