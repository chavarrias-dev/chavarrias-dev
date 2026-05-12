"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClientOption } from "@/components/clients/types";
import { saveFactura } from "../../../app/dashboard/facturas/actions";

type NewFacturaFormProps = {
  clients: ClientOption[];
  errorMessage?: string;
  /** Pre-select cliente when linked from client profile (?cliente_id=…) */
  defaultClienteId?: string;
};

type ExtractApiPayload = {
  data?: Record<string, unknown>;
  error?: string;
  numero_factura?: unknown;
  fecha?: unknown;
  monto?: unknown;
  notas?: unknown;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function normalizeFecha(raw: unknown): string {
  if (raw == null || typeof raw !== "string") return "";
  const t = raw.trim();
  const d = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function normalizeMonto(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw.replace(",", ".").trim());
    return Number.isFinite(n) ? String(n) : raw.trim();
  }
  return "";
}

function pickExtractedFields(json: ExtractApiPayload): {
  numero_factura?: unknown;
  fecha?: unknown;
  monto?: unknown;
  notas?: unknown;
} {
  const root = (json.data ?? json) as Record<string, unknown>;
  return {
    numero_factura: root.numero_factura,
    fecha: root.fecha,
    monto: root.monto,
    notas: root.notas,
  };
}

export function NewFacturaForm({
  clients,
  errorMessage,
  defaultClienteId,
}: NewFacturaFormProps) {
  const clienteDefault =
    defaultClienteId && clients.some((c) => c.id === defaultClienteId)
      ? defaultClienteId
      : "";

  const [clienteId, setClienteId] = useState(clienteDefault);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fecha, setFecha] = useState("");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  async function handleScanPdf() {
    if (!selectedFile) return;
    setIsScanning(true);
    setScanMessage(null);
    setScanError(null);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("type", "factura");
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as ExtractApiPayload;
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Error al extraer datos del PDF",
        );
      }
      const ex = pickExtractedFields(json);
      if (ex.numero_factura != null) {
        setNumeroFactura(String(ex.numero_factura).trim());
      }
      const fe = normalizeFecha(ex.fecha);
      if (fe) setFecha(fe);
      const mo = normalizeMonto(ex.monto);
      if (mo) setMonto(mo);
      if (ex.notas != null && String(ex.notas).trim()) {
        setNotas(String(ex.notas).trim());
      }
      setScanMessage("Datos extraídos, revisa y confirma");
    } catch (e) {
      setScanError(
        e instanceof Error ? e.message : "No se pudieron extraer los datos",
      );
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Nueva factura
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Registra una factura y adjunta el PDF si lo tienes.
        </p>
      </header>

      <form action={saveFactura} className="space-y-5">
        <div>
          <label
            htmlFor="cliente_id"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Cliente <span className="text-red-600">*</span>
          </label>
          <select
            id="cliente_id"
            name="cliente_id"
            required
            className={fieldClass}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="numero_factura"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Número de factura <span className="text-red-600">*</span>
          </label>
          <input
            id="numero_factura"
            name="numero_factura"
            type="text"
            required
            className={fieldClass}
            placeholder="Ej. A-1234"
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fecha"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Fecha <span className="text-red-600">*</span>
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              required
              className={fieldClass}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="monto"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Monto <span className="text-red-600">*</span>
            </label>
            <input
              id="monto"
              name="monto"
              type="text"
              inputMode="decimal"
              required
              className={fieldClass}
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-slate-700">
            Notas
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={3}
            className={`${fieldClass} min-h-[88px] resize-y`}
            placeholder="Opcional"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-slate-700">
            PDF de la factura
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input
              id="archivo"
              name="archivo"
              type="file"
              accept="application/pdf,.pdf"
              className="min-w-0 flex-1 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (!f) {
                  setSelectedFile(null);
                  setScanMessage(null);
                  setScanError(null);
                  return;
                }
                const isPdf =
                  f.type === "application/pdf" ||
                  f.name.toLowerCase().endsWith(".pdf");
                setSelectedFile(isPdf ? f : null);
                setScanMessage(null);
                setScanError(null);
              }}
            />
            {selectedFile ? (
              <button
                type="button"
                disabled={isScanning}
                onClick={() => void handleScanPdf()}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5 disabled:pointer-events-none disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Extrayendo…
                  </>
                ) : (
                  "Escanear con IA"
                )}
              </button>
            ) : null}
          </div>
        </div>

        {scanMessage ? (
          <p
            className="rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3.5 py-2.5 text-sm text-emerald-900"
            role="status"
          >
            {scanMessage}
          </p>
        ) : null}

        {scanError ? (
          <p
            className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {scanError}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/facturas"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
          >
            Guardar factura
          </button>
        </div>
      </form>
    </div>
  );
}
