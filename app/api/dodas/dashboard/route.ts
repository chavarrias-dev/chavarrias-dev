import { NextResponse } from "next/server";
import { fetchDodaDashboardRows } from "@/lib/doda-dashboard-data";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
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

  try {
    const dodas = await fetchDodaDashboardRows(supabase);
    return NextResponse.json({ ok: true, dodas });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el panel DODA";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
