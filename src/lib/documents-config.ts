export const DOCUMENT_TYPES = [
  "Acta Constitutiva",
  "Poder Notarial",
  "Identificación del Representante Legal",
  "Datos de Contacto",
  "Constancia de Situación Fiscal",
  "Opinión de Obligaciones Fiscales",
  "Comprobante de Domicilio",
  "Documento de Propiedad o Arrendamiento",
  "Manifestación bajo Protesta",
  "Captura Estatus Domicilio SAT",
  "Fotografías de Oficinas",
  "Acuse de Adición a Patente",
  "Carta Encomienda",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentStatus =
  | "vigente"
  | "por_vencer"
  | "vencido"
  | "pendiente";

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

/** Storage path: documentos/{clientId}/{documentType}.pdf */
export function documentStoragePath(
  clientId: string,
  documentType: string,
): string {
  return `documentos/${clientId}/${documentType}.pdf`;
}

export const VALIDITY_PERIODS = [
  { value: "fecha_especifica", label: "Fecha específica" },
  { value: "1_mes", label: "1 mes" },
  { value: "3_meses", label: "3 meses" },
  { value: "6_meses", label: "6 meses" },
  { value: "1_anio", label: "1 año" },
  { value: "indefinido", label: "Indefinido" },
] as const;

export type ValidityPeriod = (typeof VALIDITY_PERIODS)[number]["value"];

export function isValidityPeriod(value: string): value is ValidityPeriod {
  return (VALIDITY_PERIODS as readonly { value: string }[]).some(
    (p) => p.value === value,
  );
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calculateExpirationFromPeriod(
  fechaSubida: Date,
  period: ValidityPeriod,
): string | null {
  switch (period) {
    case "indefinido":
    case "fecha_especifica":
      return null;
    case "1_mes":
      return toDateString(addMonths(fechaSubida, 1));
    case "3_meses":
      return toDateString(addMonths(fechaSubida, 3));
    case "6_meses":
      return toDateString(addMonths(fechaSubida, 6));
    case "1_anio":
      return toDateString(addYears(fechaSubida, 1));
    default:
      return null;
  }
}
