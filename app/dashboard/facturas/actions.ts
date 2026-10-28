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
import { facturaPdfFileName, zipPdfBytes } from "@/lib/factura-pdf-delivery";
import { normalizeFormDateToIso } from "@/lib/mx-date";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendFacturaInvoiceEmail } from "@/lib/factura-email";
import {
  CRM_DOCUMENTS_BUCKET,
  storageObjectPathFromPublicUrl,
} from "@/lib/supabase-storage";

function wantsSendFacturaEmail(formData: FormData): boolean {
  const enviarEmail = formData.get("enviar_email");
  if (typeof enviarEmail === "string") {
    return enviarEmail.trim() !== "0";
  }
  const raw = formData.get("enviar_correo");
  if (raw == null) return true;
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
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

type FacturaSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function facturaListNotice(
  sent: boolean,
  clientEmail: string,
  detail?: string,
): string {
  if (sent) {
    return `/dashboard/facturas?ok=${encodeURIComponent(`Factura guardada y enviada a ${clientEmail}`)}`;
  }
  const reason = detail?.trim() ? ` ${detail.trim()}` : "";
  return `/dashboard/facturas?aviso=${encodeURIComponent(`Factura guardada. No se pudo enviar el email a ${clientEmail}.${reason}`)}`;
}

async function readPdfBytes(
  supabase: FacturaSupabase,
  file: FormDataEntryValue | null,
  archiveKind: PedimentoArchiveKind | null,
  publicUrl: string | null,
): Promise<Uint8Array | null> {
  if (file instanceof File && file.size > 0 && archiveKind === "pdf") {
    return new Uint8Array(await file.arrayBuffer());
  }
  if (!publicUrl) return null;
  const path = storageObjectPathFromPublicUrl(publicUrl);
  if (!path?.toLowerCase().endsWith(".pdf")) return null;
  const { data, error } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function storeFacturaZip(input: {
  supabase: FacturaSupabase;
  userId: string;
  facturaId: string;
  pdfBytes: Uint8Array;
  pdfFileName: string;
  removePaths: string[];
}): Promise<string> {
  const zipBytes = await zipPdfBytes(input.pdfBytes, input.pdfFileName);
  const path = recordCrmAttachmentPath(
    "facturas",
    input.userId,
    input.facturaId,
    "zip",
  );
  const { error: upErr } = await input.supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(path, zipBytes, {
      contentType: contentTypeForPedimentoArchive("zip"),
      upsert: true,
    });
  if (upErr) {
    throw new Error(`Error al subir el archivo: ${upErr.message}`);
  }

  const stale = new Set(
    input.removePaths.filter((item) => item && item !== path),
  );
  for (const extra of otherCrmAttachmentPaths(
    "facturas",
    input.userId,
    input.facturaId,
    "zip",
  )) {
    stale.add(extra);
  }
  if (stale.size > 0) {
    await input.supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .remove([...stale]);
  }

  const { data: pub } = input.supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(path);
  const { error: urlErr } = await input.supabase
    .from("facturas")
    .update({ archivo_url: pub.publicUrl })
    .eq("id", input.facturaId);
  if (urlErr) {
    throw new Error(urlErr.message);
  }
  return pub.publicUrl;
}

async function notifyFacturaClient(input: {
  supabase: FacturaSupabase;
  clienteId: string;
  numero: string;
  fecha: string;
  monto: string;
  emailBody?: string | null;
  pdfBytes?: Uint8Array | null;
  pdfFileName?: string;
}): Promise<{ sent: boolean; clientEmail: string; detail?: string }> {
  const { data: client } = await input.supabase
    .from("clients")
    .select("full_name, email, company_name, tipo_razon_social")
    .eq("id", input.clienteId)
    .maybeSingle();

  const row = client as {
    email?: string | null;
    full_name?: string | null;
    company_name?: string | null;
    tipo_razon_social?: string | null;
  } | null;

  const clientEmail = row?.email?.trim() ?? "";
  const clientName = row?.full_name?.trim() || "cliente";

  if (!clientEmail) {
    return { sent: false, clientEmail: "el cliente" };
  }

  try {
    await sendFacturaInvoiceEmail(input.supabase, {
      toEmail: clientEmail,
      recipientName: clientName,
      companyName: row?.company_name,
      tipoRazonSocial: row?.tipo_razon_social,
      numeroFactura: input.numero,
      fechaIso: input.fecha,
      monto: input.monto,
      emailBody: input.emailBody,
      pdfBytes: input.pdfBytes,
      pdfFileName: input.pdfFileName,
    });
    return { sent: true, clientEmail };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error desconocido al enviar";
    console.error("[factura-email]", error);
    return { sent: false, clientEmail, detail };
  }
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

  const pdfBytes = await readPdfBytes(
    supabase,
    file,
    archiveKind,
    uploaded.url,
  );
  const uploadedPath = uploaded.url
    ? storageObjectPathFromPublicUrl(uploaded.url)
    : null;
  const expectsPdf =
    archiveKind === "pdf" ||
    Boolean(uploadedPath?.toLowerCase().endsWith(".pdf"));

  if (expectsPdf) {
    if (!pdfBytes) {
      redirect(
        `/dashboard/facturas/${row.id}/edit?error=${encodeURIComponent("No se pudo leer el PDF para comprimirlo")}`,
      );
    }
    const pdfFileName = facturaPdfFileName(numero.trim());
    try {
      await storeFacturaZip({
        supabase,
        userId: user.id,
        facturaId: row.id,
        pdfBytes,
        pdfFileName,
        removePaths: uploadedPath ? [uploadedPath] : [],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al comprimir el PDF";
      redirect(
        `/dashboard/facturas/${row.id}/edit?error=${encodeURIComponent(message)}`,
      );
    }

  }

  if (
    !expectsPdf &&
    !uploaded.url &&
    file instanceof File &&
    file.size > 0 &&
    archiveKind
  ) {
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

  if (wantsSendFacturaEmail(formData)) {
    const notice = await notifyFacturaClient({
      supabase,
      clienteId: clienteId.trim(),
      numero: numero.trim(),
      fecha: fechaIso,
      monto,
      emailBody: emptyToNull(formData.get("notas")),
      pdfBytes: pdfBytes ?? undefined,
      pdfFileName: pdfBytes
        ? facturaPdfFileName(numero.trim())
        : undefined,
    });

    await logActivity(supabase, {
      userId: user.id,
      userEmail: user.email ?? "",
      action: "creó factura",
      entityType: "factura",
      entityId: row.id,
      entityName: numero.trim(),
    });

    redirect(facturaListNotice(notice.sent, notice.clientEmail, notice.detail));
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "creó factura",
    entityType: "factura",
    entityId: row.id,
    entityName: numero.trim(),
  });

  redirect(
    `/dashboard/facturas?ok=${encodeURIComponent("Factura guardada")}`,
  );
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
    .select(
      "id, numero_factura, fecha, monto, cliente_id, archivo_url, notas",
    )
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
    archivo_url: string | null;
    notas: string | null;
  };

  const pdfBytes = await readPdfBytes(
    supabase,
    null,
    null,
    f.archivo_url,
  );

  const notice = await notifyFacturaClient({
    supabase,
    clienteId: f.cliente_id,
    numero: f.numero_factura.trim(),
    fecha: f.fecha,
    monto: String(f.monto),
    emailBody: f.notas,
    pdfBytes,
    pdfFileName: pdfBytes
      ? facturaPdfFileName(f.numero_factura.trim())
      : undefined,
  });

  if (notice.sent) {
    redirect(
      `/dashboard/facturas/${id}/edit?ok=${encodeURIComponent(`Correo enviado a ${notice.clientEmail}`)}`,
    );
  }
  redirect(
    `/dashboard/facturas/${id}/edit?aviso=${encodeURIComponent(`No se pudo enviar el email a ${notice.clientEmail}.${notice.detail ? ` ${notice.detail}` : ""}`)}`,
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

  const pdfBytes = await readPdfBytes(
    supabase,
    file,
    archiveKind,
    uploaded.url,
  );
  const uploadedPath = uploaded.url
    ? storageObjectPathFromPublicUrl(uploaded.url)
    : null;
  const expectsPdf =
    archiveKind === "pdf" ||
    Boolean(uploadedPath?.toLowerCase().endsWith(".pdf"));

  if (expectsPdf) {
    if (!pdfBytes) {
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent("No se pudo leer el PDF para comprimirlo")}`,
      );
    }
    const pdfFileName = facturaPdfFileName(numero.trim());
    const previous = storageObjectPathFromPublicUrl(
      (existing as { archivo_url?: string | null }).archivo_url ?? "",
    );
    try {
      await storeFacturaZip({
        supabase,
        userId: user.id,
        facturaId: id,
        pdfBytes,
        pdfFileName,
        removePaths: [previous, uploadedPath].filter(
          (item): item is string => Boolean(item),
        ),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al comprimir el PDF";
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(message)}`,
      );
    }

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

  if (wantsSendFacturaEmail(formData)) {
    const notice = await notifyFacturaClient({
      supabase,
      clienteId: clienteId.trim(),
      numero: numero.trim(),
      fecha: fechaIso,
      monto,
      emailBody: emptyToNull(formData.get("notas")),
      pdfBytes: pdfBytes ?? undefined,
      pdfFileName: pdfBytes
        ? facturaPdfFileName(numero.trim())
        : undefined,
    });

    await logActivity(supabase, {
      userId: user.id,
      userEmail: user.email ?? "",
      action: "editó factura",
      entityType: "factura",
      entityId: id,
      entityName: numero.trim(),
    });

    redirect(facturaListNotice(notice.sent, notice.clientEmail, notice.detail));
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó factura",
    entityType: "factura",
    entityId: id,
    entityName: numero.trim(),
  });

  redirect(
    `/dashboard/facturas?ok=${encodeURIComponent("Factura actualizada")}`,
  );
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
