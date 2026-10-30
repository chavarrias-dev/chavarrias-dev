"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import {
  collectFacturaArchiveEntries,
  type FacturaArchiveEntry,
} from "@/lib/factura-archive";
import {
  contentTypeForPedimentoArchive,
  otherCrmAttachmentPaths,
  recordCrmAttachmentPath,
} from "@/lib/pedimento-archive";
import { zipArchiveEntries } from "@/lib/factura-pdf-delivery";
import { normalizeFormDateToIso } from "@/lib/mx-date";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendFacturaInvoiceEmail } from "@/lib/factura-email";
import {
  buildFacturaEmailRecipients,
  formatFacturaRecipientsForDisplay,
  parseFacturaExtraEmails,
  serializeFacturaExtraEmails,
  validateFacturaExtraEmails,
} from "@/lib/factura-email-recipients";
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

async function removeStagingPaths(
  supabase: FacturaSupabase,
  paths: string[],
): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  await supabase.storage.from(CRM_DOCUMENTS_BUCKET).remove(unique);
}

async function storeFacturaZipBundle(input: {
  supabase: FacturaSupabase;
  userId: string;
  facturaId: string;
  entries: FacturaArchiveEntry[];
  removePaths: string[];
}): Promise<string> {
  const zipBytes = await zipArchiveEntries(
    input.entries.map((entry) => ({
      name: entry.name,
      bytes: entry.bytes,
    })),
  );
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

function emailAttachmentsFromEntries(
  entries: FacturaArchiveEntry[],
): { filename: string; bytes: Uint8Array }[] {
  return entries.map((entry) => ({
    filename: entry.name,
    bytes: entry.bytes,
  }));
}

function parseCorreosAdicionalesField(
  formData: FormData,
  fail: (message: string) => never,
): string[] {
  const extras = parseFacturaExtraEmails(formData.get("correos_adicionales"));
  const validated = validateFacturaExtraEmails(extras);
  if (!validated.ok) {
    fail(validated.error);
  }
  return extras;
}

function parseStoredCorreosAdicionales(raw: unknown): string[] {
  const extras = parseFacturaExtraEmails(
    typeof raw === "string" ? raw : "",
  );
  const validated = validateFacturaExtraEmails(extras);
  return validated.ok ? extras : [];
}

async function notifyFacturaClient(input: {
  supabase: FacturaSupabase;
  clienteId: string;
  numero: string;
  fecha: string;
  monto: string;
  emailBody?: string | null;
  extraEmails?: string[];
  attachmentFiles?: { filename: string; bytes: Uint8Array }[];
  archivoUrl?: string | null;
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
  const recipients = buildFacturaEmailRecipients(
    clientEmail,
    input.extraEmails ?? [],
  );

  if (!clientEmail) {
    return { sent: false, clientEmail: "el cliente" };
  }

  const recipientsLabel = formatFacturaRecipientsForDisplay(recipients);

  try {
    await sendFacturaInvoiceEmail(input.supabase, {
      toEmails: recipients,
      recipientName: clientName,
      companyName: row?.company_name,
      tipoRazonSocial: row?.tipo_razon_social,
      numeroFactura: input.numero,
      fechaIso: input.fecha,
      monto: input.monto,
      emailBody: input.emailBody,
      attachmentFiles: input.attachmentFiles,
      archivoUrl: input.archivoUrl,
    });
    return { sent: true, clientEmail: recipientsLabel };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error desconocido al enviar";
    console.error("[factura-email]", error);
    return { sent: false, clientEmail, detail };
  }
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const collected = await collectFacturaArchiveEntries({
    supabase,
    formData,
    storagePrefix: `facturas/${user.id}/`,
  });
  if (!collected.ok) {
    redirect(
      `/dashboard/facturas/new?error=${encodeURIComponent(collected.error)}`,
    );
  }

  const correosAdicionales = parseCorreosAdicionalesField(formData, (message) => {
    redirect(`/dashboard/facturas/new?error=${encodeURIComponent(message)}`);
  });

  const { data: row, error } = await supabase
    .from("facturas")
    .insert({
      numero_factura: numero.trim(),
      fecha: fechaIso,
      monto,
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      correos_adicionales: serializeFacturaExtraEmails(correosAdicionales),
      archivo_url: null,
    })
    .select("id")
    .single();

  if (error || !row) {
    redirect(
      `/dashboard/facturas/new?error=${encodeURIComponent(error?.message ?? "Error al guardar")}`,
    );
  }

  let archivoUrl: string | null = null;
  if (collected.entries.length > 0) {
    try {
      archivoUrl = await storeFacturaZipBundle({
        supabase,
        userId: user.id,
        facturaId: row.id,
        entries: collected.entries,
        removePaths: collected.stagingPaths,
      });
      await removeStagingPaths(supabase, collected.stagingPaths);
    } catch (zipError) {
      const message =
        zipError instanceof Error
          ? zipError.message
          : "Error al comprimir los archivos";
      redirect(
        `/dashboard/facturas/${row.id}/edit?error=${encodeURIComponent(message)}`,
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
      extraEmails: correosAdicionales,
      attachmentFiles: emailAttachmentsFromEntries(collected.entries),
      archivoUrl,
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
      "id, numero_factura, fecha, monto, cliente_id, archivo_url, notas, correos_adicionales",
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
    correos_adicionales: string | null;
  };

  const notice = await notifyFacturaClient({
    supabase,
    clienteId: f.cliente_id,
    numero: f.numero_factura.trim(),
    fecha: f.fecha,
    monto: String(f.monto),
    emailBody: f.notas,
    extraEmails: parseStoredCorreosAdicionales(f.correos_adicionales),
    archivoUrl: f.archivo_url,
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

  const collected = await collectFacturaArchiveEntries({
    supabase,
    formData,
    storagePrefix: `facturas/${user.id}/`,
  });
  if (!collected.ok) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(collected.error)}`,
    );
  }

  const correosAdicionales = parseCorreosAdicionalesField(formData, (message) => {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(message)}`,
    );
  });

  const { error: updErr } = await supabase
    .from("facturas")
    .update({
      numero_factura: numero.trim(),
      fecha: fechaIso,
      monto,
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      correos_adicionales: serializeFacturaExtraEmails(correosAdicionales),
    })
    .eq("id", id);

  if (updErr) {
    redirect(
      `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(updErr.message)}`,
    );
  }

  const previousPath = storageObjectPathFromPublicUrl(
    (existing as { archivo_url?: string | null }).archivo_url ?? "",
  );

  let archivoUrl =
    (existing as { archivo_url?: string | null }).archivo_url ?? null;

  if (collected.entries.length > 0) {
    try {
      archivoUrl = await storeFacturaZipBundle({
        supabase,
        userId: user.id,
        facturaId: id,
        entries: collected.entries,
        removePaths: [previousPath, ...collected.stagingPaths].filter(
          (item): item is string => Boolean(item),
        ),
      });
      await removeStagingPaths(supabase, collected.stagingPaths);
    } catch (zipError) {
      const message =
        zipError instanceof Error
          ? zipError.message
          : "Error al comprimir los archivos";
      redirect(
        `/dashboard/facturas/${id}/edit?error=${encodeURIComponent(message)}`,
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
      extraEmails: correosAdicionales,
      attachmentFiles:
        collected.entries.length > 0
          ? emailAttachmentsFromEntries(collected.entries)
          : undefined,
      archivoUrl,
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
