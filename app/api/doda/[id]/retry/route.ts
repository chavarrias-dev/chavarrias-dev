import { NextResponse } from "next/server";
import { performDodaRecheck } from "@/lib/doda-perform-recheck";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
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

  const outcome = await performDodaRecheck(supabase, id);

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error },
      { status: outcome.status },
    );
  }

  return NextResponse.json({
    ok: true,
    doda: outcome.doda,
    previous_status: outcome.previousStatus,
    resolved: outcome.resolved,
  });
}
