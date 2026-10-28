"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import {
  acceptedPedimentoPreuploadedUrl,
  contentTypeForPedimentoArchive,
  otherCrmAttachmentPaths,
  recordCrmAttachmentPath,
  validatePedimentoArchiveFile,
  verifyPedimentoArchiveFileMagic,
  verifyPedimentoPublicArchiveMagic,
  type PedimentoArchiveKind,
} from "@/lib/pedimento-archive";
import { normalizeFormDateToIso } from "@/lib/mx-date";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendFacturaInvoiceEmail } from "@/lib/factura-email";
import {
  CRM_DOCUMENTS_BUCKET,
  storageObjectPathFromPublicUrl,
} from "@/lib/supabase-storage";

function wantsSendFacturaEmail(formData: FormData): boolean {
  const raw = formData.get("enviar_correo");
  if (raw == null) return true;
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

async function sendFacturaEmailForRecord(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: {
    facturaId: string;
    clienteId: string;
    numeroFactura: string;
    fechaIso: string;
    monto: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("full_name, email")
    .eq("id", input.clienteId)
    .maybeSingle();

  if (clientErr || !client?.email?.trim()) {
    return {
      ok: false,
      message: clientErr?.message ?? "El cliente no tiene correo electrónico",
    };
  }

  const { data: facturaRow } = await supabase
    .from("facturas")
    .select("archivo_url")
    .eq("id", input.facturaId)
    .maybeSingle();

  try {
    await sendFacturaInvoiceEmail(supabase, {
      toEmail: client.email.trim(),
      recipientName: client.full_name?.trim() || "Cliente",
      numeroFactura: input.numeroFactura,
      fechaIso: input.fechaIso,
      monto: input.monto,
      archivoUrl: (facturaRow as { archivo_url?: string | null } | null)
        ?.archivo_url,
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar el correo";
    console.error("[factura-email]", error);
    return { ok: false, message };
  }
}

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

async function readFacturaArchiveKindFromForm(
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

export async function saveFactura(formData: FormData) {
  const numero = formData.get("numero_factura");
  const fecha = formData.get("fecha");
  const montoRaw = formData.get("monto");
  const clienteId = formData.get("cliente_id");

  if (typeof numero !== "string" || !numero.trim()) {
    redirect("/dashboard/facturas/new?error=Numero%20de%20factura%20requerido");
  }
  const fechaIso = normalizeFormDateToIso(fecha);
  if (!fechaIso) {
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
  const archiveKind = await readFacturaArchiveKindFromForm(file, (message) => {
    redirect(`/dashboard/facturas/new?error=${encodeURIComponent(message)}`);
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
    `facturas/${user.id}/`,
  );
  if (!uploaded.ok) {
    redirect(
      `/dashboard/facturas/new?error=${encodeURIComponent(uploaded.error)}`,
    );
  }
  if (uploaded.url) {
    const remoteMagic = await verifyPedimentoPublicArchiveMagic(uploaded.url);
    if (!remoteMagic.ok) {
      redirect(
        `/dashboard/facturas/new?error=${encodeURIComponent(remoteMagic.error)}`,
      );
    }
  }

  const { data: row, error } = await supabase
    .from("facturas")
    .insert({
      numero_factura: numero.trim(),
      fecha: fechaIso,
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
    const path = recordCrmAttachmentPath("facturas", user.id, row.id, archiveKind);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: contentTypeForPedimentoArchive(archiveKind),
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

  let redirectUrl = "/dashboard/facturas";
  if (wantsSendFacturaEmail(formData)) {
    const mail = await sendFacturaEmailForRecord(supabase, {
      facturaId: row.id,
      clienteId: clienteId.trim(),
      numeroFactura: numero.trim(),
      fechaIso,
      monto,
    });
    if (mail.ok) {
      redirectUrl = "/dashboard/facturas?correo=enviado";
    } else {
      redirectUrl = `/dashboard/facturas?correo=error&correo_msg=${encodeURIComponent(mail.message)}`;
    }
  }

  redirect(redirectUrl);
}

export async function resendFacturaEmail(formData: FormData) {
  const facturaId = formData.get("factura_id");
  if (typeof facturaId !== "string" || !facturaId.trim()) {
    redirect("/dashboard/facturas?error=Identificador%20invalido");
  }
  const id = facturaId.trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: row, error } = await supabase
    .from("facturas")
    .select("id, numero_factura, fecha, monto, cliente_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    redirect("/dashboard/facturas?error=Factura%20no%20encontrada");
  }

  const f = row as {
    numero_factura: string;
    fecha: string;
    monto: string;
    cliente_id: string;
  };

  const mail = await sendFacturaEmailForRecord(supabase, {
    facturaId: id,
    clienteId: f.cliente_id,
    numeroFactura: f.numero_factura.trim(),
    fechaIso: f.fecha,
    monto: String(f.monto),
  });

  if (mail.ok) {
    redirect(`/dashboard/facturas/${id}/edit?correo=enviado`);
  }
  redirect(
    `/dashboard/facturas/${id}/edit?correo=error&correo_msg=${encodeURIComponent(mail.message)}`,
  );
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
  const fechaIso = normalizeFormDateToIso(fecha);
  if (!fechaIso) {
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
  const archiveKind = await readFacturaArchiveKindFromForm(file, (message) => {
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

  const uploaded = acceptedPedimentoPreuploadedUrl(
    formData,
    `facturas/${user.id}/`,
  );
  if (!uploaded.ok) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(uploaded.error)}`,
    );
  }
  if (uploaded.url) {
    const remoteMagic = await verifyPedimentoPublicArchiveMagic(uploaded.url);
    if (!remoteMagic.ok) {
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(remoteMagic.error)}`,
      );
    }
  }

  const { error: updErr } = await supabase
    .from("facturas")
    .update({
      numero_factura: numero.trim(),
      fecha: fechaIso,
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
    const path = recordCrmAttachmentPath("facturas", user.id, id, archiveKind);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: contentTypeForPedimentoArchive(archiveKind),
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(`Error al subir el archivo: ${upErr.message}`)}`,
      );
    }
    await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .remove(otherCrmAttachmentPaths("facturas", user.id, id, archiveKind));
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

  let redirectUrl = "/dashboard/facturas";
  if (wantsSendFacturaEmail(formData)) {
    const mail = await sendFacturaEmailForRecord(supabase, {
      facturaId: id,
      clienteId: clienteId.trim(),
      numeroFactura: numero.trim(),
      fechaIso,
      monto,
    });
    if (mail.ok) {
      redirectUrl = "/dashboard/facturas?correo=enviado";
    } else {
      redirectUrl = `/dashboard/facturas?correo=error&correo_msg=${encodeURIComponent(mail.message)}`;
    }
  }

  redirect(redirectUrl);
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
      recordCrmAttachmentPath("facturas", user.id, id, "pdf"),
      recordCrmAttachmentPath("facturas", user.id, id, "zip"),
      recordCrmAttachmentPath("facturas", user.id, id, "rar"),
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
