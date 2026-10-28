import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { facturaPdfFileName } from "@/lib/factura-pdf-delivery";
import {
  applyFacturaEmailBodyTemplate,
  buildFacturaEmailTemplateVars,
  loadFacturaEmailTemplateSettings,
} from "@/lib/factura-email-settings";

const COMPANY_NAME = "Chavarrias Servicios Aduanales";

const VERIFIED_FACTURA_FROM =
  "Chavarrias Servicios Aduanales <no-reply@chavarrias.com.mx>";

export type SendFacturaInvoiceEmailInput = {
  toEmail: string;
  recipientName: string;
  companyName?: string | null;
  tipoRazonSocial?: string | null;
  numeroFactura: string;
  fechaIso: string;
  monto: string;
  descripcionCorreo?: string | null;
  archivoUrl?: string | null;
  pdfBytes?: Uint8Array | null;
  pdfFileName?: string;
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

function isPdfArchiveUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().includes(".pdf");
  }
}

async function loadPdfAttachment(
  archivoUrl: string,
  numeroFactura: string,
): Promise<{ filename: string; content: Buffer } | null> {
  if (!isPdfArchiveUrl(archivoUrl)) {
    return null;
  }

  const res = await fetch(archivoUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el PDF adjunto (${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    return null;
  }

  return {
    filename: sanitizeAttachmentFilename(numeroFactura),
    content: buffer,
  };
}

export async function sendFacturaInvoiceEmail(
  supabase: SupabaseClient,
  input: SendFacturaInvoiceEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const to = input.toEmail.trim();
  if (!to) {
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
    descripcionCorreo: input.descripcionCorreo,
  });
  const bodyText = applyFacturaEmailBodyTemplate(settings.bodyTemplate, vars);

  const attachments: { filename: string; content: Buffer }[] = [];
  if (input.pdfBytes && input.pdfBytes.length > 0) {
    attachments.push({
      filename:
        input.pdfFileName?.trim() ||
        facturaPdfFileName(input.numeroFactura),
      content: Buffer.from(input.pdfBytes),
    });
  } else if (input.archivoUrl?.trim()) {
    const pdf = await loadPdfAttachment(
      input.archivoUrl.trim(),
      input.numeroFactura,
    );
    if (pdf) {
      attachments.push(pdf);
    }
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
