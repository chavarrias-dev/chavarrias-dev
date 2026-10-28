import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_FACTURA_BODY_TEMPLATE,
  DEFAULT_FACTURA_SIGNATURE_URL,
  FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS,
} from "@/lib/factura-email-template-defaults";
import { isoDateToMxDisplay } from "@/lib/mx-date";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

export {
  DEFAULT_FACTURA_BODY_TEMPLATE,
  DEFAULT_FACTURA_SIGNATURE_URL,
  FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS,
};

export const FACTURA_EMAIL_SETTINGS_ID = "default";

const FACTURA_EMAIL_SETTINGS_STORAGE_PATH =
  "settings/factura-email-settings.json";

const DEFAULT_FACTURA_SIGNATURE_URL_SERVER =
  process.env.FACTURA_EMAIL_SIGNATURE_URL?.trim() ||
  DEFAULT_FACTURA_SIGNATURE_URL;

export type FacturaEmailTemplateSettings = {
  bodyTemplate: string;
  signatureUrl: string;
  updatedAt: string | null;
};

export type FacturaEmailTemplateVars = {
  empresa: string;
  monto: string;
  tramite: string;
  referencia: string;
  tipo_cliente: string;
  descripcion_correo: string;
  nombre: string;
  numero: string;
  fecha: string;
};

export type BuildFacturaEmailTemplateVarsInput = {
  recipientName: string;
  companyName?: string | null;
  tipoRazonSocial?: string | null;
  numeroFactura: string;
  fechaIso: string;
  monto: string;
  /** Texto libre por factura (campo descripción para correo). */
  descripcionCorreo?: string | null;
};

type FacturaEmailSettingsRow = {
  body_template: string;
  signature_url: string;
  updated_at: string | null;
};

type StoredFacturaEmailSettingsJson = {
  body_template?: string;
  signature_url?: string;
  updated_at?: string | null;
};

export function getDefaultFacturaEmailTemplateSettings(): FacturaEmailTemplateSettings {
  return {
    bodyTemplate: DEFAULT_FACTURA_BODY_TEMPLATE,
    signatureUrl: DEFAULT_FACTURA_SIGNATURE_URL_SERVER,
    updatedAt: null,
  };
}

export function isFacturaEmailSettingsTableMissing(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("factura_email_settings") ||
    message.includes("schema cache")
  );
}

function rowToSettings(row: FacturaEmailSettingsRow): FacturaEmailTemplateSettings {
  return {
    bodyTemplate: row.body_template.trim(),
    signatureUrl: row.signature_url.trim(),
    updatedAt: row.updated_at,
  };
}

function parseStoredJson(
  json: StoredFacturaEmailSettingsJson,
): FacturaEmailTemplateSettings | null {
  const body = json.body_template?.trim();
  const signature = json.signature_url?.trim();
  if (!body || !signature) return null;
  return {
    bodyTemplate: body,
    signatureUrl: signature,
    updatedAt: json.updated_at ?? null,
  };
}

async function loadFacturaEmailTemplateSettingsFromStorage(): Promise<FacturaEmailTemplateSettings | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .download(FACTURA_EMAIL_SETTINGS_STORAGE_PATH);

    if (error || !data) {
      return null;
    }

    const json = JSON.parse(
      await data.text(),
    ) as StoredFacturaEmailSettingsJson;
    return parseStoredJson(json);
  } catch (error) {
    console.error("[factura-email-settings] storage load failed", error);
    return null;
  }
}

async function saveFacturaEmailTemplateSettingsToStorage(
  settings: FacturaEmailTemplateSettings,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const payload: StoredFacturaEmailSettingsJson = {
    body_template: settings.bodyTemplate,
    signature_url: settings.signatureUrl,
    updated_at: settings.updatedAt,
  };
  const body = JSON.stringify(payload, null, 2);

  const { error } = await admin.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(FACTURA_EMAIL_SETTINGS_STORAGE_PATH, body, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "60",
    });

  if (error) {
    throw new Error(error.message);
  }
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

export function buildFacturaEmailTemplateVars(
  input: BuildFacturaEmailTemplateVarsInput,
): FacturaEmailTemplateVars {
  const montoFormatted = formatMontoMx(input.monto);
  const empresa =
    input.companyName?.trim() ||
    input.recipientName.trim() ||
    "Cliente";
  return {
    empresa,
    monto: montoFormatted,
    tramite: montoFormatted,
    referencia: input.numeroFactura.trim(),
    tipo_cliente: input.tipoRazonSocial?.trim() || "Cliente",
    descripcion_correo: input.descripcionCorreo?.trim() ?? "",
    nombre: input.recipientName.trim(),
    numero: input.numeroFactura.trim(),
    fecha: isoDateToMxDisplay(input.fechaIso),
  };
}

export function applyFacturaEmailBodyTemplate(
  template: string,
  vars: FacturaEmailTemplateVars,
): string {
  return template
    .replaceAll("{{empresa}}", vars.empresa)
    .replaceAll("{{monto}}", vars.monto)
    .replaceAll("{{tramite}}", vars.tramite)
    .replaceAll("{{referencia}}", vars.referencia)
    .replaceAll("{{tipo_cliente}}", vars.tipo_cliente)
    .replaceAll("{{descripcion_correo}}", vars.descripcion_correo)
    .replaceAll("{{nombre}}", vars.nombre)
    .replaceAll("{{numero}}", vars.numero)
    .replaceAll("{{fecha}}", vars.fecha);
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
    if (isFacturaEmailSettingsTableMissing(error)) {
      const fromStorage = await loadFacturaEmailTemplateSettingsFromStorage();
      return fromStorage ?? getDefaultFacturaEmailTemplateSettings();
    }
    console.error("[factura-email-settings] load failed", error);
    return getDefaultFacturaEmailTemplateSettings();
  }

  const row = data as FacturaEmailSettingsRow | null;
  if (!row?.body_template?.trim() || !row.signature_url?.trim()) {
    const fromStorage = await loadFacturaEmailTemplateSettingsFromStorage();
    return fromStorage ?? getDefaultFacturaEmailTemplateSettings();
  }

  return rowToSettings(row);
}

export type SaveFacturaEmailTemplateResult = {
  settings: FacturaEmailTemplateSettings;
  /** True when saved to Storage because the DB table is not migrated yet. */
  usedStorageFallback: boolean;
};

export async function saveFacturaEmailTemplateSettings(
  supabase: SupabaseClient,
  input: {
    bodyTemplate: string;
    signatureUrl: string;
    updatedBy: string;
  },
): Promise<SaveFacturaEmailTemplateResult> {
  const updatedAt = new Date().toISOString();
  const settings: FacturaEmailTemplateSettings = {
    bodyTemplate: input.bodyTemplate.trim(),
    signatureUrl: input.signatureUrl.trim(),
    updatedAt,
  };

  const { data, error } = await supabase
    .from("factura_email_settings")
    .upsert(
      {
        id: FACTURA_EMAIL_SETTINGS_ID,
        body_template: settings.bodyTemplate,
        signature_url: settings.signatureUrl,
        updated_at: updatedAt,
        updated_by: input.updatedBy,
      },
      { onConflict: "id" },
    )
    .select("body_template, signature_url, updated_at")
    .single();

  if (!error && data) {
    return {
      settings: rowToSettings(data as FacturaEmailSettingsRow),
      usedStorageFallback: false,
    };
  }

  if (error && isFacturaEmailSettingsTableMissing(error)) {
    await saveFacturaEmailTemplateSettingsToStorage(settings);
    return { settings, usedStorageFallback: true };
  }

  throw new Error(error?.message ?? "No se pudo guardar la plantilla");
}
