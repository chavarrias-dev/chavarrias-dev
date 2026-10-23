"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import {
  acceptedPedimentoPreuploadedUrl,
  contentTypeForPedimentoArchive,
  otherPedimentoArchivePaths,
  recordPedimentoArchivePath,
  validatePedimentoArchiveFile,
  verifyPedimentoArchiveFileMagic,
  verifyPedimentoPublicArchiveMagic,
  type PedimentoArchiveKind,
} from "@/lib/pedimento-archive";
import { normalizeFormDateToIso } from "@/lib/mx-date";
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

function readFechaCierre(
  raw: unknown,
  apertura: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: true, value: null };
  }
  const cierre = normalizeFormDateToIso(raw);
  if (!cierre) {
    return { ok: false, error: "Fecha de cierre inválida" };
  }
  if (cierre < apertura) {
    return {
      ok: false,
      error: "La fecha de cierre no puede ser anterior a la de apertura",
    };
  }
  return { ok: true, value: cierre };
}

async function readPedimentoArchiveKindFromForm(
  file: FormDataEntryValue | null,
  fail: (message: string) => never,
): Promise<PedimentoArchiveKind | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const validated = validatePedimentoArchiveFile(file);
  if (!validated.ok) fail(validated.error);
  const magic = await verifyPedimentoArchiveFileMagic(file, validated.kind);
  if (!magic.ok) fail(magic.error);
  return validated.kind;
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
  const fechaIso = normalizeFormDateToIso(fecha);
  if (!fechaIso) {
    redirect(
      "/dashboard/pedimentos/new?error=Fecha%20de%20apertura%20requerida",
    );
  }
  const fechaCierre = readFechaCierre(formData.get("fecha_cierre"), fechaIso);
  if (!fechaCierre.ok) {
    redirect(
      `/dashboard/pedimentos/new?error=${encodeURIComponent(fechaCierre.error)}`,
    );
  }
  if (typeof aduana !== "string" || !aduana.trim()) {
    redirect("/dashboard/pedimentos/new?error=Aduana%20requerida");
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect("/dashboard/pedimentos/new?error=Cliente%20requerido");
  }

  const file = formData.get("archivo");
  const archiveKind = await readPedimentoArchiveKindFromForm(file, (message) => {
    redirect(`/dashboard/pedimentos/new?error=${encodeURIComponent(message)}`);
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const uploaded = acceptedPedimentoPreuploadedUrl(
    formData,
    `pedimentos/${user.id}/`,
  );
  if (!uploaded.ok) {
    redirect(
      `/dashboard/pedimentos/new?error=${encodeURIComponent(uploaded.error)}`,
    );
  }
  if (uploaded.url) {
    const remoteMagic = await verifyPedimentoPublicArchiveMagic(uploaded.url);
    if (!remoteMagic.ok) {
      redirect(
        `/dashboard/pedimentos/new?error=${encodeURIComponent(remoteMagic.error)}`,
      );
    }
  }

  const { data: row, error } = await supabase
    .from("pedimentos")
    .insert({
      numero_pedimento: numero.value,
      fecha: fechaIso,
      fecha_cierre: fechaCierre.value,
      aduana: aduana.trim(),
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      archivo_url: uploaded.url,
    })
    .select("id")
    .single();

  if (error || !row) {
    redirect(
      `/dashboard/pedimentos/new?error=${encodeURIComponent(error?.message ?? "Error al guardar")}`,
    );
  }

  if (!uploaded.url && file instanceof File && file.size > 0 && archiveKind) {
    const path = recordPedimentoArchivePath(user.id, row.id, archiveKind);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: contentTypeForPedimentoArchive(archiveKind),
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/pedimentos/${row.id}/edit?error=${encodeURIComponent(`Error al subir el archivo: ${upErr.message}`)}`,
      );
    }
    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    await supabase
      .from("pedimentos")
      .update({ archivo_url: pub.publicUrl })
      .eq("id", row.id);
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
  const fechaIso = normalizeFormDateToIso(fecha);
  if (!fechaIso) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Fecha de apertura requerida")}`,
    );
  }
  const fechaCierre = readFechaCierre(formData.get("fecha_cierre"), fechaIso);
  if (!fechaCierre.ok) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(fechaCierre.error)}`,
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
  const archiveKind = await readPedimentoArchiveKindFromForm(file, (message) => {
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

  const uploaded = acceptedPedimentoPreuploadedUrl(
    formData,
    `pedimentos/${user.id}/`,
  );
  if (!uploaded.ok) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(uploaded.error)}`,
    );
  }
  if (uploaded.url) {
    const remoteMagic = await verifyPedimentoPublicArchiveMagic(uploaded.url);
    if (!remoteMagic.ok) {
      redirect(
        `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(remoteMagic.error)}`,
      );
    }
  }

  const { error: updErr } = await supabase
    .from("pedimentos")
    .update({
      numero_pedimento: numero.value,
      fecha: fechaIso,
      fecha_cierre: fechaCierre.value,
      aduana: aduana.trim(),
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      ...(uploaded.url ? { archivo_url: uploaded.url } : {}),
    })
    .eq("id", id);

  if (updErr) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(updErr.message)}`,
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
    const path = recordPedimentoArchivePath(user.id, id, archiveKind);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: contentTypeForPedimentoArchive(archiveKind),
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(`Error al subir el archivo: ${upErr.message}`)}`,
      );
    }
    await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .remove(otherPedimentoArchivePaths(user.id, id, archiveKind));
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
      recordPedimentoArchivePath(user.id, id, "pdf"),
      recordPedimentoArchivePath(user.id, id, "zip"),
      recordPedimentoArchivePath(user.id, id, "rar"),
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
