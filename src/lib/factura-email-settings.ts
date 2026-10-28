import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isoDateToMxDisplay } from "@/lib/mx-date";

export const FACTURA_EMAIL_SETTINGS_ID = "default";

export const DEFAULT_FACTURA_BODY_TEMPLATE =
  "Estimado {{nombre}}, le enviamos adjunta su factura {{numero}} con fecha {{fecha}} por un monto de {{monto}}. Cualquier duda estamos a sus órdenes. Chavarrias Servicios Aduanales";

export const DEFAULT_FACTURA_SIGNATURE_URL =
  process.env.FACTURA_EMAIL_SIGNATURE_URL?.trim() ||
  "https://chsdpusnekhqbzqjlpbb.supabase.co/storage/v1/object/public/crm-documents/FACTURAS_.png";

export type FacturaEmailTemplateSettings = {
  bodyTemplate: string;
  signatureUrl: string;
  updatedAt: string | null;
};

export type FacturaEmailTemplateVars = {
  nombre: string;
  numero: string;
  fecha: string;
  monto: string;
};

type FacturaEmailSettingsRow = {
  body_template: string;
  signature_url: string;
  updated_at: string | null;
};

export function getDefaultFacturaEmailTemplateSettings(): FacturaEmailTemplateSettings {
  return {
    bodyTemplate: DEFAULT_FACTURA_BODY_TEMPLATE,
    signatureUrl: DEFAULT_FACTURA_SIGNATURE_URL,
    updatedAt: null,
  };
}

function formatMontoMx(monto: string): string {
  const n = Number.parseFloat(monto.replace(",", ".").trim());
  if (!Number.isFinite(n)) return monto;
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildFacturaEmailTemplateVars(input: {
  recipientName: string;
  numeroFactura: string;
  fechaIso: string;
  monto: string;
}): FacturaEmailTemplateVars {
  return {
    nombre: input.recipientName.trim(),
    numero: input.numeroFactura.trim(),
    fecha: isoDateToMxDisplay(input.fechaIso),
    monto: formatMontoMx(input.monto),
  };
}

export function applyFacturaEmailBodyTemplate(
  template: string,
  vars: FacturaEmailTemplateVars,
): string {
  return template
    .replaceAll("{{nombre}}", vars.nombre)
    .replaceAll("{{numero}}", vars.numero)
    .replaceAll("{{fecha}}", vars.fecha)
    .replaceAll("{{monto}}", vars.monto);
}

export function validateFacturaEmailBodyTemplate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "El texto del correo no puede estar vacío";
  }
  if (trimmed.length > 10_000) {
    return "El texto es demasiado largo (máximo 10 000 caracteres)";
  }
  return null;
}

export function validateFacturaEmailSignatureUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "La URL de la firma es obligatoria";
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "La URL de la firma debe ser http o https";
    }
  } catch {
    return "URL de firma inválida";
  }
  if (trimmed.length > 2048) {
    return "La URL de la firma es demasiado larga";
  }
  return null;
}

export async function loadFacturaEmailTemplateSettings(
  supabase: SupabaseClient,
): Promise<FacturaEmailTemplateSettings> {
  const { data, error } = await supabase
    .from("factura_email_settings")
    .select("body_template, signature_url, updated_at")
    .eq("id", FACTURA_EMAIL_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("[factura-email-settings] load failed", error);
    return getDefaultFacturaEmailTemplateSettings();
  }

  const row = data as FacturaEmailSettingsRow | null;
  if (!row?.body_template?.trim() || !row.signature_url?.trim()) {
    return getDefaultFacturaEmailTemplateSettings();
  }

  return {
    bodyTemplate: row.body_template.trim(),
    signatureUrl: row.signature_url.trim(),
    updatedAt: row.updated_at,
  };
}
