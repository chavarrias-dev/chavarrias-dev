import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("dodas")
    .update({ is_monitored: false })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "DODA no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
