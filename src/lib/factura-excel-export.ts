import { isoDateToMxDisplay } from "@/lib/mx-date";

export type FacturaExcelClientMeta = {
  fullName: string;
  companyName?: string | null;
  email?: string | null;
  rfc?: string | null;
};

export type FacturaExcelRow = {
  numero_factura: string;
  fecha: string;
  monto: string;
  created_at: string | null;
  archivo_url: string | null;
  notas: string | null;
  correos_adicionales?: string | null;
};

export function buildFacturaExcelDataRows(
  client: FacturaExcelClientMeta,
  facturas: FacturaExcelRow[],
) {
  return facturas.map((f) => ({
    Cliente: client.fullName,
    Empresa: client.companyName?.trim() || "",
    "Correo cliente": client.email?.trim() || "",
    RFC: client.rfc?.trim() || "",
    "Número de factura": f.numero_factura,
    "Fecha factura": f.fecha ? isoDateToMxDisplay(f.fecha) : "",
    "Monto (MXN)": Number.parseFloat(String(f.monto)) || 0,
    "Fecha registro": f.created_at
      ? isoDateToMxDisplay(f.created_at.slice(0, 10))
      : "",
    "Tiene archivo": f.archivo_url?.trim() ? "Sí" : "No",
    "Enlace archivo": f.archivo_url?.trim() || "",
    "Correos adicionales": (f.correos_adicionales ?? "")
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean)
      .join(", "),
    "Descripción correo": f.notas?.trim() || "",
  }));
}

export function facturaExcelExportFileName(clientName: string): string {
  const safe =
    clientName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48) || "cliente";
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());
  return `facturas-${safe}-${dateKey}.xlsx`;
}
