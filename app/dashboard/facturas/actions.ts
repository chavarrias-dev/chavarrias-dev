"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import {
  contentTypeForArchive,
  acceptedPreuploadedUrl,
  recordArchivePath,
  validateArchiveFile,
  type ArchiveKind,
} from "@/lib/archive-file";
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

function parseMonto(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const n = raw.replace(",", ".").trim();
  if (!n) return null;
  const v = Number.parseFloat(n);
  if (!Number.isFinite(v)) return null;
  return v.toFixed(2);
}

function readArchiveKind(
  file: FormDataEntryValue | null,
  fail: (message: string) => never,
): ArchiveKind | null {
  if (!(file instanceof File) || file.size === 0) return null;
  const validated = validateArchiveFile(file);
  if (!validated.ok) fail(validated.error);
  return validated.kind;
}

export async function saveFactura(formData: FormData) {
  const numero = formData.get("numero_factura");
  const fecha = formData.get("fecha");
  const montoRaw = formData.get("monto");
  const clienteId = formData.get("cliente_id");

  if (typeof numero !== "string" || !numero.trim()) {
    redirect("/dashboard/facturas/new?error=Numero%20de%20factura%20requerido");
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect("/dashboard/facturas/new?error=Fecha%20requerida");
  }
  const monto = parseMonto(montoRaw);
  if (!monto) {
    redirect("/dashboard/facturas/new?error=Monto%20invalido");
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect("/dashboard/facturas/new?error=Cliente%20requerido");
  }

  const file = formData.get("archivo");
  const archiveKind = readArchiveKind(file, (message) => {
    redirect(`/dashboard/facturas/new?error=${encodeURIComponent(message)}`);
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const uploaded = acceptedPreuploadedUrl(formData, `facturas/${user.id}/`);
  if (!uploaded.ok) {
    redirect(
      `/dashboard/facturas/new?error=${encodeURIComponent(uploaded.error)}`,
    );
  }

  const { data: row, error } = await supabase
    .from("facturas")
    .insert({
      numero_factura: numero.trim(),
      fecha: fecha.trim(),
      monto,
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      archivo_url: uploaded.url,
    })
    .select("id")
    .single();

  if (error || !row) {
    redirect(
      `/dashboard/facturas/new?error=${encodeURIComponent(error?.message ?? "Error al guardar")}`,
    );
  }

  if (!uploaded.url && file instanceof File && file.size > 0 && archiveKind) {
    const path = recordArchivePath("facturas", user.id, row.id, archiveKind);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, bytes, {
        contentType: contentTypeForArchive(archiveKind),
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/facturas/${row.id}/edit?error=${encodeURIComponent(`Error al subir el archivo: ${upErr.message}`)}`,
      );
    }
    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    await supabase
      .from("facturas")
      .update({ archivo_url: pub.publicUrl })
      .eq("id", row.id);
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "creó factura",
    entityType: "factura",
    entityId: row.id,
    entityName: numero.trim(),
  });

  redirect("/dashboard/facturas");
}

export async function updateFactura(formData: FormData) {
  const facturaId = formData.get("factura_id");
  if (typeof facturaId !== "string" || !facturaId.trim()) {
    redirect("/dashboard/facturas?error=Identificador%20invalido");
  }
  const id = facturaId.trim();

  const numero = formData.get("numero_factura");
  const fecha = formData.get("fecha");
  const montoRaw = formData.get("monto");
  const clienteId = formData.get("cliente_id");

  if (typeof numero !== "string" || !numero.trim()) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent("Número de factura requerido")}`,
    );
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent("Fecha requerida")}`,
    );
  }
  const monto = parseMonto(montoRaw);
  if (!monto) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent("Monto inválido")}`,
    );
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent("Cliente requerido")}`,
    );
  }

  const file = formData.get("archivo");
  const archiveKind = readArchiveKind(file, (message) => {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(message)}`,
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
    .from("facturas")
    .select("id, archivo_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    redirect("/dashboard/facturas?error=Factura%20no%20encontrada");
  }

  const uploaded = acceptedPreuploadedUrl(formData, `facturas/${user.id}/`);
  if (!uploaded.ok) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(uploaded.error)}`,
    );
  }

  const { error: updErr } = await supabase
    .from("facturas")
    .update({
      numero_factura: numero.trim(),
      fecha: fecha.trim(),
      monto,
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      ...(uploaded.url ? { archivo_url: uploaded.url } : {}),
    })
    .eq("id", id);

  if (updErr) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(updErr.message)}`,
    );
  }

  if (uploaded.url) {
    const previous = storageObjectPathFromPublicUrl(
      (existing as { archivo_url?: string | null }).archivo_url ?? "",
    );
    const next = storageObjectPathFromPublicUrl(uploaded.url);
    if (previous && next && previous !== next) {
      await supabase.storage.from(CRM_DOCUMENTS_BUCKET).remove([previous]);
    }
  } else if (file instanceof File && file.size > 0 && archiveKind) {
    const path = recordArchivePath("facturas", user.id, id, archiveKind);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, bytes, {
        contentType: contentTypeForArchive(archiveKind),
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(`Error al subir el archivo: ${upErr.message}`)}`,
      );
    }
    await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .remove([
        recordArchivePath(
          "facturas",
          user.id,
          id,
          archiveKind === "pdf" ? "zip" : "pdf",
        ),
      ]);
    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    const { error: urlErr } = await supabase
      .from("facturas")
      .update({ archivo_url: pub.publicUrl })
      .eq("id", id);
    if (urlErr) {
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(urlErr.message)}`,
      );
    }
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó factura",
    entityType: "factura",
    entityId: id,
    entityName: numero.trim(),
  });

  redirect("/dashboard/facturas");
}

export async function deleteFactura(formData: FormData) {
  const raw = formData.get("factura_id");
  if (typeof raw !== "string" || !raw.trim()) {
    redirect("/dashboard/facturas?error=Identificador%20invalido");
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
    .from("facturas")
    .select("id, archivo_url, numero_factura")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    redirect("/dashboard/facturas?error=Factura%20no%20encontrada");
  }

  const numeroLabel =
    (row as { numero_factura?: string }).numero_factura?.trim() ?? id;

  if (row.archivo_url) {
    const fromUrl = storageObjectPathFromPublicUrl(row.archivo_url);
    const paths = [
      recordArchivePath("facturas", user.id, id, "pdf"),
      recordArchivePath("facturas", user.id, id, "zip"),
    ];
    if (fromUrl) paths.push(fromUrl);
    await supabase.storage.from(CRM_DOCUMENTS_BUCKET).remove(paths);
  }

  const { error: delErr } = await supabase.from("facturas").delete().eq("id", id);

  if (delErr) {
    redirect(
      `/dashboard/facturas?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó factura",
    entityType: "factura",
    entityId: id,
    entityName: numeroLabel,
  });

  redirect("/dashboard/facturas");
}
