"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import {
  ARCHIVE_FILE_ERROR,
  ARCHIVE_MAX_BYTES,
  archiveKindFromFile,
  contentTypeForArchive,
  recordArchivePath,
  type ArchiveKind,
} from "@/lib/archive-file";
import { readPedimentoNumber } from "@/lib/pedimento-number";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CRM_DOCUMENTS_BUCKET,
  storageObjectPathFromPublicUrl,
} from "@/lib/supabase-storage";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function readArchiveKind(
  file: FormDataEntryValue | null,
  fail: (message: string) => never,
): ArchiveKind | null {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > ARCHIVE_MAX_BYTES) {
    fail("El archivo supera el límite de 25 MB");
  }
  const kind = archiveKindFromFile(file);
  if (!kind) fail(ARCHIVE_FILE_ERROR);
  return kind;
}

export async function savePedimento(formData: FormData) {
  const numero = readPedimentoNumber(formData);
  const fecha = formData.get("fecha");
  const aduana = formData.get("aduana");
  const clienteId = formData.get("cliente_id");

  if (!numero.ok) {
    redirect(
      `/dashboard/pedimentos/new?error=${encodeURIComponent(numero.error)}`,
    );
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect("/dashboard/pedimentos/new?error=Fecha%20requerida");
  }
  if (typeof aduana !== "string" || !aduana.trim()) {
    redirect("/dashboard/pedimentos/new?error=Aduana%20requerida");
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect("/dashboard/pedimentos/new?error=Cliente%20requerido");
  }

  const file = formData.get("archivo");
  const archiveKind = readArchiveKind(file, (message) => {
    redirect(`/dashboard/pedimentos/new?error=${encodeURIComponent(message)}`);
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: row, error } = await supabase
    .from("pedimentos")
    .insert({
      numero_pedimento: numero.value,
      fecha: fecha.trim(),
      aduana: aduana.trim(),
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      archivo_url: null,
    })
    .select("id")
    .single();

  if (error || !row) {
    redirect(
      `/dashboard/pedimentos/new?error=${encodeURIComponent(error?.message ?? "Error al guardar")}`,
    );
  }

  if (file instanceof File && file.size > 0 && archiveKind) {
    const path = recordArchivePath("pedimentos", user.id, row.id, archiveKind);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: contentTypeForArchive(archiveKind),
        upsert: true,
      });
    if (!upErr) {
      const { data: pub } = supabase.storage
        .from(CRM_DOCUMENTS_BUCKET)
        .getPublicUrl(path);
      await supabase
        .from("pedimentos")
        .update({ archivo_url: pub.publicUrl })
        .eq("id", row.id);
    }
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "creó pedimento",
    entityType: "pedimento",
    entityId: row.id,
    entityName: numero.value,
  });

  redirect("/dashboard/pedimentos");
}

export async function updatePedimento(formData: FormData) {
  const pedimentoId = formData.get("pedimento_id");
  if (typeof pedimentoId !== "string" || !pedimentoId.trim()) {
    redirect("/dashboard/pedimentos?error=Identificador%20invalido");
  }
  const id = pedimentoId.trim();

  const numero = readPedimentoNumber(formData);
  const fecha = formData.get("fecha");
  const aduana = formData.get("aduana");
  const clienteId = formData.get("cliente_id");

  if (!numero.ok) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(numero.error)}`,
    );
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Fecha requerida")}`,
    );
  }
  if (typeof aduana !== "string" || !aduana.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Aduana requerida")}`,
    );
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Cliente requerido")}`,
    );
  }

  const file = formData.get("archivo");
  const archiveKind = readArchiveKind(file, (message) => {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(message)}`,
    );
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("pedimentos")
    .select("id, archivo_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    redirect("/dashboard/pedimentos?error=Pedimento%20no%20encontrado");
  }

  const { error: updErr } = await supabase
    .from("pedimentos")
    .update({
      numero_pedimento: numero.value,
      fecha: fecha.trim(),
      aduana: aduana.trim(),
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
    })
    .eq("id", id);

  if (updErr) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(updErr.message)}`,
    );
  }

  if (file instanceof File && file.size > 0 && archiveKind) {
    const path = recordArchivePath("pedimentos", user.id, id, archiveKind);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: contentTypeForArchive(archiveKind),
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(`Error al subir el archivo: ${upErr.message}`)}`,
      );
    }
    await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .remove([
        recordArchivePath(
          "pedimentos",
          user.id,
          id,
          archiveKind === "pdf" ? "zip" : "pdf",
        ),
      ]);
    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    const { error: urlErr } = await supabase
      .from("pedimentos")
      .update({ archivo_url: pub.publicUrl })
      .eq("id", id);
    if (urlErr) {
      redirect(
        `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(urlErr.message)}`,
      );
    }
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó pedimento",
    entityType: "pedimento",
    entityId: id,
    entityName: numero.value,
  });

  redirect("/dashboard/pedimentos");
}

export async function deletePedimento(formData: FormData) {
  const raw = formData.get("pedimento_id");
  if (typeof raw !== "string" || !raw.trim()) {
    redirect("/dashboard/pedimentos?error=Identificador%20invalido");
  }
  const id = raw.trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: row, error: fetchErr } = await supabase
    .from("pedimentos")
    .select("id, archivo_url, numero_pedimento")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    redirect("/dashboard/pedimentos?error=Pedimento%20no%20encontrado");
  }

  const numeroLabel =
    (row as { numero_pedimento?: string }).numero_pedimento?.trim() ?? id;

  if (row.archivo_url) {
    const fromUrl = storageObjectPathFromPublicUrl(row.archivo_url);
    const paths = [
      recordArchivePath("pedimentos", user.id, id, "pdf"),
      recordArchivePath("pedimentos", user.id, id, "zip"),
    ];
    if (fromUrl) paths.push(fromUrl);
    await supabase.storage.from(CRM_DOCUMENTS_BUCKET).remove(paths);
  }

  const { error: delErr } = await supabase.from("pedimentos").delete().eq("id", id);

  if (delErr) {
    redirect(
      `/dashboard/pedimentos?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó pedimento",
    entityType: "pedimento",
    entityId: id,
    entityName: numeroLabel,
  });

  redirect("/dashboard/pedimentos");
}
