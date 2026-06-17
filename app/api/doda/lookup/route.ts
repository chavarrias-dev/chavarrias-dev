import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("No autorizado", 401);
    }

    const actorRole = await getUserRole(supabase, user.id);
    if (actorRole !== "admin" && actorRole !== "empleado") {
      return jsonError("No autorizado", 403);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonError("Cuerpo de solicitud inválido", 400);
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError('Falta el archivo del DODA (campo "file")', 400);
    }

    // Dynamic import keeps sharp/puppeteer load failures inside this try/catch.
    const { runDodaLookupAndSave } = await import("@/lib/doda-service");

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

    console.error("[api/doda/lookup]", error);

    return jsonError(message, 500);
  }
}
