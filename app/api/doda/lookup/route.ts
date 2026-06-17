import { NextResponse } from "next/server";
import { runDodaLookupAndSave } from "@/lib/doda-service";
import { logActivity } from "@/lib/activity-log";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const actorRole = await getUserRole(supabase, user.id);
  if (actorRole !== "admin" && actorRole !== "empleado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud inválido" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Falta el archivo del DODA (campo \"file\")" },
      { status: 400 },
    );
  }

  try {
    const { lookup, doda } = await runDodaLookupAndSave({
      supabase,
      file,
      clienteId: emptyToNull(formData.get("cliente_id")),
      pedimentoId: emptyToNull(formData.get("pedimento_id")),
      notas: emptyToNull(formData.get("notas")),
      source: "dashboard",
      createdBy: user.id,
      storagePathPrefix: `dodas/${user.id}`,
    });

    await logActivity(supabase, {
      userId: user.id,
      userEmail: user.email ?? "",
      action:
        lookup.lookupStatus === "verificado"
          ? "consultó DODA en SAT"
          : "registró DODA para revisión manual",
      entityType: "doda",
      entityId: doda.id,
      entityName:
        lookup.numeroIntegracion ??
        lookup.satStatus ??
        `DODA ${doda.id.slice(0, 8)}`,
    });

    return NextResponse.json({
      ok: true,
      doda,
      debugRawQrPayload: lookup.debugRawQrPayload,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al procesar el DODA";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
