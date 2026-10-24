import { NextResponse } from "next/server";
import { isPedimentoNumberTaken } from "@/lib/pedimento-duplicates";
import { parsePedimentoNumber } from "@/lib/pedimento-number";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const anio = url.searchParams.get("anio") ?? "";
  const aduana = url.searchParams.get("aduana") ?? "";
  const agente = url.searchParams.get("agente") ?? "";
  const consecutivo = url.searchParams.get("consecutivo") ?? "";
  const excludeId = url.searchParams.get("excludeId")?.trim() || undefined;

  const parts = parsePedimentoNumber(
    `${anio} ${aduana} ${agente} ${consecutivo}`.trim(),
  );

  if (
    !/^\d{2}$/.test(parts.anio) ||
    !/^\d{2}$/.test(parts.aduana) ||
    !/^\d{4}$/.test(parts.agente) ||
    !/^\d{6,8}$/.test(parts.consecutivo)
  ) {
    return NextResponse.json({ duplicate: false, complete: false });
  }

  const duplicate = await isPedimentoNumberTaken(
    supabase,
    parts,
    excludeId,
  );

  return NextResponse.json({ duplicate, complete: true });
}
