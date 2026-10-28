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

export const DEFAULT_FACTURA_BODY_TEMPLATE = `Factura para el cliente {{empresa}}  POR LA CANTIDAD DE {{monto}}

Trámite  : {{tramite}}
REFERENCIA FACTURA: {{referencia}}

Cliente: {{tipo_cliente}}
Datos para pago:
Banco: Santander
Cuenta: 65-510187613
CLABE: 014822655101876134
Quedo atento a cualquier comentario.
Gracias`;

export const DEFAULT_FACTURA_SIGNATURE_URL =
  process.env.NEXT_PUBLIC_FACTURA_EMAIL_SIGNATURE_URL?.trim() ||
  "https://chsdpusnekhqbzqjlpbb.supabase.co/storage/v1/object/public/crm-documents/FACTURAS_.png";
