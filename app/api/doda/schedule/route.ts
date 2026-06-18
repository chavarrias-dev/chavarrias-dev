import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import type { DodaRecord } from "@/lib/doda-types";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILES = 3;

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

function collectFiles(formData: FormData): File[] {
  const files: File[] = [];

  for (const value of formData.values()) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    }
  }

  return files;
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

    const files = collectFiles(formData);
    if (files.length === 0) {
      return jsonError("Sube al menos un archivo DODA", 400);
    }
    if (files.length > MAX_FILES) {
      return jsonError(`Solo puedes programar hasta ${MAX_FILES} DODAs a la vez`, 400);
    }

    const clienteId = emptyToNull(formData.get("cliente_id"));
    const notas = emptyToNull(formData.get("notas"));
    const { runDodaLookupAndSave } = await import("@/lib/doda-service");

    const dodas: DodaRecord[] = [];
    const failures: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const { lookup, doda } = await runDodaLookupAndSave({
          supabase,
          file,
          clienteId,
          notas,
          source: "dashboard_schedule",
          createdBy: user.id,
          isMonitored: true,
          storagePathPrefix: `dodas/${user.id}`,
        });

        dodas.push(doda);

        await logActivity(supabase, {
          userId: user.id,
          userEmail: user.email ?? "",
          action:
            lookup.lookupStatus === "verificado"
              ? "programó monitoreo DODA en SAT"
              : "programó DODA para monitoreo (revisión manual)",
          entityType: "doda",
          entityId: doda.id,
          entityName:
            lookup.numeroIntegracion ??
            lookup.satStatus ??
            `DODA ${doda.id.slice(0, 8)}`,
        });
      } catch (error) {
        failures.push({
          fileName: file.name,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo programar el DODA",
        });
      }
    }

    if (dodas.length === 0) {
      return jsonError(
        failures[0]?.error ?? "No se pudo programar ningún DODA",
        500,
      );
    }

    return NextResponse.json({
      ok: true,
      dodas,
      failures: failures.length ? failures : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al programar DODAs";

    console.error("[api/doda/schedule]", error);
    return jsonError(message, 500);
  }
}
