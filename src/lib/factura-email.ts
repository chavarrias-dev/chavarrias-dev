import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { Resend } from "resend";
import { facturaPdfFileName } from "@/lib/factura-pdf-delivery";
import {
  buildFacturaEmailTemplateVars,
  loadFacturaEmailTemplateSettings,
  resolveFacturaEmailBodyText,
} from "@/lib/factura-email-settings";

const COMPANY_NAME = "Chavarrias Servicios Aduanales";

const VERIFIED_FACTURA_FROM =
  "Chavarrias Servicios Aduanales <no-reply@chavarrias.com.mx>";

export type SendFacturaInvoiceEmailInput = {
  /** Destinatarios (siempre incluye el correo del cliente). */
  toEmails: string[];
  recipientName: string;
  companyName?: string | null;
  tipoRazonSocial?: string | null;
  numeroFactura: string;
  fechaIso: string;
  monto: string;
  /** Texto completo del correo guardado en la factura. */
  emailBody?: string | null;
  archivoUrl?: string | null;
  pdfBytes?: Uint8Array | null;
  pdfFileName?: string;
  /** Archivos individuales adjuntos al correo (hasta 10). */
  attachmentFiles?: { filename: string; bytes: Uint8Array }[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getFacturaEmailFrom(): string {
  const configured =
    process.env.FACTURA_RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return VERIFIED_FACTURA_FROM;

  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured;
  const domain = address.split("@")[1]?.trim().toLowerCase() ?? "";
  if (domain === "chavarrias.com.mx") {
    return configured.includes("<")
      ? configured
      : `${COMPANY_NAME} <${configured}>`;
  }

  console.warn(
    "[factura-email] remitente no usa chavarrias.com.mx; se usa el verificado",
    { configuredDomain: domain || null },
  );
  return VERIFIED_FACTURA_FROM;
}

export function buildFacturaEmailSubject(numeroFactura: string): string {
  return `Factura ${numeroFactura.trim()} - ${COMPANY_NAME}`;
}

export function buildFacturaEmailPlainText(bodyText: string): string {
  return bodyText.replace(/\r\n/g, "\n").trimEnd();
}

export function buildFacturaEmailHtml(
  bodyText: string,
  signatureUrl: string,
): string {
  const body = escapeHtml(bodyText.trim());
  const signature = escapeHtml(signatureUrl.trim());

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000000;max-width:640px">
      <p style="margin:0 0 20px;white-space:pre-wrap">${body}</p>
      <img
        src="${signature}"
        alt="${escapeHtml(COMPANY_NAME)} — Facturación y Cobranza"
        width="600"
        style="max-width:100%;height:auto;display:block;border:0"
      />
    </div>
  `.trim();
}

function sanitizeAttachmentFilename(numeroFactura: string): string {
  const base = numeroFactura.trim().replace(/[^\w.-]+/g, "_") || "factura";
  return `${base}.pdf`;
}

function archiveKindFromUrl(url: string): "pdf" | "zip" | "rar" | null {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.endsWith(".pdf")) return "pdf";
    if (path.endsWith(".zip")) return "zip";
    if (path.endsWith(".rar")) return "rar";
    return null;
  } catch {
    const lower = url.toLowerCase();
    if (lower.includes(".pdf")) return "pdf";
    if (lower.includes(".zip")) return "zip";
    if (lower.includes(".rar")) return "rar";
    return null;
  }
}

async function loadAttachmentsFromStoredUrl(
  archivoUrl: string,
  numeroFactura: string,
): Promise<{ filename: string; content: Buffer }[]> {
  const kind = archiveKindFromUrl(archivoUrl);
  if (!kind) return [];

  const res = await fetch(archivoUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el archivo adjunto (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    return [];
  }

  if (kind === "pdf") {
    return [
      {
        filename: sanitizeAttachmentFilename(numeroFactura),
        content: buffer,
      },
    ];
  }

  if (kind === "zip") {
    const zip = await JSZip.loadAsync(buffer);
    const attachments: { filename: string; content: Buffer }[] = [];
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const name =
        path.split("/").pop()?.trim() ||
        `archivo-${attachments.length + 1}`;
      const bytes = await entry.async("uint8array");
      if (bytes.length === 0) continue;
      attachments.push({ filename: name, content: Buffer.from(bytes) });
    }
    return attachments;
  }

  const segment = archivoUrl.split("?")[0]?.split("/").pop() ?? "";
  const filename =
    segment && segment.endsWith(".rar")
      ? segment
      : `${numeroFactura.trim().replace(/[^\w.-]+/g, "_") || "factura"}.rar`;

  return [{ filename, content: buffer }];
}

export async function sendFacturaInvoiceEmail(
  supabase: SupabaseClient,
  input: SendFacturaInvoiceEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const to = input.toEmails.map((email) => email.trim()).filter(Boolean);
  if (to.length === 0) {
    throw new Error("El cliente no tiene correo electrónico");
  }

  const settings = await loadFacturaEmailTemplateSettings(supabase);
  const vars = buildFacturaEmailTemplateVars({
    recipientName: input.recipientName,
    companyName: input.companyName,
    tipoRazonSocial: input.tipoRazonSocial,
    numeroFactura: input.numeroFactura,
    fechaIso: input.fechaIso,
    monto: input.monto,
  });
  const bodyText = resolveFacturaEmailBodyText(
    input.emailBody,
    settings.bodyTemplate,
    vars,
  );

  const attachments: { filename: string; content: Buffer }[] = [];
  if (input.attachmentFiles?.length) {
    for (const file of input.attachmentFiles) {
      if (!file.bytes.length) continue;
      attachments.push({
        filename: file.filename,
        content: Buffer.from(file.bytes),
      });
    }
  } else if (input.pdfBytes && input.pdfBytes.length > 0) {
    attachments.push({
      filename:
        input.pdfFileName?.trim() ||
        facturaPdfFileName(input.numeroFactura),
      content: Buffer.from(input.pdfBytes),
    });
  } else if (input.archivoUrl?.trim()) {
    const stored = await loadAttachmentsFromStoredUrl(
      input.archivoUrl.trim(),
      input.numeroFactura,
    );
    attachments.push(...stored);
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getFacturaEmailFrom(),
    to,
    subject: buildFacturaEmailSubject(input.numeroFactura),
    text: buildFacturaEmailPlainText(bodyText),
    html: buildFacturaEmailHtml(bodyText, settings.signatureUrl),
    ...(attachments.length > 0 ? { attachments } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
