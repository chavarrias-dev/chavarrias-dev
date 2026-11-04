import { NextResponse } from "next/server";
import { appendClientDodasToEstadoDeCuenta } from "@/lib/google-sheets/append-client-dodas";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export const runtime = "nodejs";

export async function POST(_req: Request, context: RouteContext) {
  const { clientId } = await context.params;

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

  const admin = createSupabaseAdminClient();
  const result = await appendClientDodasToEstadoDeCuenta(admin, clientId);

  if (!result.ok) {
    const status =
      result.code === "not_configured" || result.code === "no_sheet" ? 400 : 500;
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    tabTitle: result.tabTitle,
    appended: result.appended,
    skipped: result.skipped,
    spreadsheetUrl: result.spreadsheetUrl,
  });
}
