import "server-only";

import JSZip from "jszip";
import { Resend } from "resend";

export async function zipPdfBytes(
  pdfBytes: Uint8Array,
  innerFileName: string,
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(innerFileName, pdfBytes);
  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export function facturaPdfFileName(numeroFactura: string): string {
  const safe = numeroFactura.replace(/[^\w.\- ]+/g, " ").replace(/\s+/g, " ").trim();
  const base = safe || "factura";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function facturaFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) {
    return "Chavarrias Servicios Aduanales <onboarding@resend.dev>";
  }

  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured;
  const domain = address.split("@")[1]?.trim().toLowerCase();
  if (!domain || domain === "resend.dev") {
    return configured.includes("<")
      ? configured
      : `Chavarrias Servicios Aduanales <${configured}>`;
  }

  return `Chavarrias Servicios Aduanales <notificaciones@${domain}>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatFacturaFecha(fechaIso: string): string {
  const [year, month, day] = fechaIso.split("-");
  if (!year || !month || !day) return fechaIso;
  return `${day}/${month}/${year}`;
}

function formatFacturaMonto(monto: string): string {
  const value = Number(monto);
  if (!Number.isFinite(value)) return monto;
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

export async function sendFacturaEmail(input: {
  to: string;
  clientName: string;
  numeroFactura: string;
  fecha: string;
  monto: string;
  pdfBytes?: Uint8Array | null;
  pdfFileName?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const clientName = input.clientName.trim() || "cliente";
  const numero = input.numeroFactura.trim();
  const fecha = formatFacturaFecha(input.fecha);
  const monto = formatFacturaMonto(input.monto);
  const html = `<p>Estimado ${escapeHtml(clientName)}, le enviamos adjunta su factura ${escapeHtml(numero)} con fecha ${escapeHtml(fecha)} por un monto de ${escapeHtml(monto)}. Cualquier duda estamos a sus órdenes. Chavarrias Servicios Aduanales</p>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: facturaFromAddress(),
    to: input.to,
    subject: `Factura ${numero} - Chavarrias Servicios Aduanales`,
    html,
    ...(input.pdfBytes && input.pdfFileName
      ? {
          attachments: [
            {
              filename: input.pdfFileName,
              content: Buffer.from(input.pdfBytes),
            },
          ],
        }
      : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
