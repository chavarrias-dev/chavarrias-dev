import { isoDateToMxDisplay } from "@/lib/mx-date";

export const FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS = [
  "{{empresa}}",
  "{{monto}}",
  "{{tramite}}",
  "{{referencia}}",
  "{{tipo_cliente}}",
  "{{nombre}}",
  "{{numero}}",
  "{{fecha}}",
] as const;

/** Texto completo del correo; se edita en cada factura (campo descripción para correo). */
export const DEFAULT_FACTURA_BODY_TEMPLATE = `Factura para el cliente {{empresa}}  POR LA CANTIDAD DE {{monto}}

Trámite  : {{tramite}}
REFERENCIA FACTURA: {{referencia}}

Cliente: {{tipo_cliente}}
Quedo atento a cualquier comentario.
Gracias`;

export const DEFAULT_FACTURA_SIGNATURE_URL =
  process.env.NEXT_PUBLIC_FACTURA_EMAIL_SIGNATURE_URL?.trim() ||
  "https://chsdpusnekhqbzqjlpbb.supabase.co/storage/v1/object/public/crm-documents/FACTURAS_.png";

export type FacturaEmailTemplateVars = {
  empresa: string;
  monto: string;
  tramite: string;
  referencia: string;
  tipo_cliente: string;
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
};

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
    .replaceAll("{{nombre}}", vars.nombre)
    .replaceAll("{{numero}}", vars.numero)
    .replaceAll("{{fecha}}", vars.fecha);
}

export function resolveFacturaEmailBodyText(
  storedBody: string | null | undefined,
  fallbackTemplate: string,
  vars: FacturaEmailTemplateVars,
): string {
  const source = storedBody?.trim() || fallbackTemplate.trim() || DEFAULT_FACTURA_BODY_TEMPLATE;
  return applyFacturaEmailBodyTemplate(source, vars);
}
