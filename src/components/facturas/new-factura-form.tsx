"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClientOption } from "@/components/clients/types";
import { ArchiveFileInput } from "@/components/files/archive-file-input";
import { MxDateInput } from "@/components/forms/mx-date-input";
import {
  applyFacturaEmailBodyTemplate,
  buildFacturaEmailTemplateVars,
  DEFAULT_FACTURA_BODY_TEMPLATE,
} from "@/lib/factura-email-template-defaults";
import { saveFactura } from "../../../app/dashboard/facturas/actions";

type NewFacturaFormProps = {
  clients: ClientOption[];
  errorMessage?: string;
  /** Pre-select cliente when linked from client profile (?cliente_id=…) */
  defaultClienteId?: string;
  /** Plantilla inicial copiada al campo mensaje del correo. */
  initialEmailBody?: string;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  initialEmailBody,
}: NewFacturaFormProps) {
  const clienteDefault =
    defaultClienteId && clients.some((c) => c.id === defaultClienteId)
      ? defaultClienteId
      : "";

  const [clienteId, setClienteId] = useState(clienteDefault);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fecha, setFecha] = useState("");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState(
    () => initialEmailBody?.trim() || DEFAULT_FACTURA_BODY_TEMPLATE,
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const selectedClient = clients.find((client) => client.id === clienteId) ?? null;
  const clientEmail = selectedClient?.email?.trim() ?? "";
  const submitLabel = sendEmail
    ? "Guardar y enviar por email"
    : "Guardar factura";

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
      setScanMessage("Datos extraídos, revisa y confirma");
    } catch (e) {
      setScanError(
        e instanceof Error ? e.message : "No se pudieron extraer los datos",
      );
    } finally {
      setIsScanning(false);
    }
  }

  function buildVarsFromForm() {
    return buildFacturaEmailTemplateVars({
      recipientName: selectedClient?.full_name ?? "",
      companyName: selectedClient?.company_name,
      tipoRazonSocial: selectedClient?.tipo_razon_social,
      numeroFactura: numeroFactura.trim() || "—",
      fechaIso: fecha.trim() || new Date().toISOString().slice(0, 10),
      monto: monto.trim() || "0",
    });
  }

  function handleApplyVariablesToEmailBody() {
    const template = notas.trim() || DEFAULT_FACTURA_BODY_TEMPLATE;
    setNotas(applyFacturaEmailBodyTemplate(template, buildVarsFromForm()));
  }

  function handleRestoreEmailTemplate() {
    setNotas(initialEmailBody?.trim() || DEFAULT_FACTURA_BODY_TEMPLATE);
  }

  return (
    <div className="mx-auto w-full max-w-xl font-poppins lg:max-w-6xl">
      <header className="mb-4">
        <h1 className="text-xl font-medium tracking-tight text-slate-900 sm:text-2xl">
          Nueva factura
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Completa los datos, confirma el cliente y adjunta el archivo.
        </p>
      </header>

      <form action={saveFactura} className="flex flex-col gap-5 pb-28 sm:pb-0">
        <input type="hidden" name="enviar_email" value={sendEmail ? "1" : "0"} />

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-x-8">
        <section className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#227DE8]">
              1
            </p>
            <h2 className="mt-1 text-base font-medium text-slate-900">
              Datos de la factura
            </h2>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="fecha"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Fecha <span className="text-red-600">*</span>
              </label>
              <MxDateInput
                id="fecha"
                name="fecha"
                required
                className={fieldClass}
                value={fecha}
                onValueChange={setFecha}
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

        </section>

        <section className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#227DE8]">
              2
            </p>
            <h2 className="mt-1 text-base font-medium text-slate-900">Cliente</h2>
          </div>

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
              className={`${fieldClass} min-h-12`}
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

          {selectedClient ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                {selectedClient.full_name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {clientEmail || "Sin correo"}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                {selectedClient.company_name?.trim() || "Sin empresa"}
              </p>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#227DE8]">
              3
            </p>
            <h2 className="mt-1 text-base font-medium text-slate-900">Archivo</h2>
          </div>

          <div>
            <label
              htmlFor="archivo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Archivo (PDF, ZIP o RAR)
            </label>
            <ArchiveFileInput
              id="archivo"
              folder="facturas"
              onFileSelected={setAttachedFile}
              onPdfSelected={(file) => {
                setSelectedFile(file);
                setScanMessage(null);
                setScanError(null);
              }}
            />
            {attachedFile ? (
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-medium">{attachedFile.name}</span>
                <span className="text-slate-500">
                  {" "}
                  · {formatFileSize(attachedFile.size)}
                </span>
              </p>
            ) : null}
          </div>

          {selectedFile ? (
            <button
              type="button"
              disabled={isScanning}
              onClick={() => void handleScanPdf()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
            >
              {isScanning ? "Extrayendo…" : "Escanear con IA"}
            </button>
          ) : null}

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
        </section>

        <section className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#227DE8]">
              4
            </p>
            <h2 className="mt-1 text-base font-medium text-slate-900">
              Mensaje del correo al cliente
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Edita el texto que recibirá el cliente. Se guarda con la factura.
            </p>
          </div>

          <div>
            <label
              htmlFor="notas"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Descripción para correo
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={10}
              required={sendEmail}
              className={`${fieldClass} min-h-[220px] resize-y font-mono text-[13px] leading-relaxed`}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplyVariablesToEmailBody}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#227DE8]/40 bg-white px-3 text-sm font-medium text-[#227DE8] hover:bg-[#227DE8]/5"
              >
                Rellenar empresa, montos y referencia
              </button>
              <button
                type="button"
                onClick={handleRestoreEmailTemplate}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Restaurar plantilla inicial
              </button>
            </div>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="size-5 shrink-0 accent-[#227DE8]"
            />
            <span className="text-sm font-medium text-slate-800">
              Enviar factura por email al cliente
            </span>
          </label>

          {sendEmail ? (
            <p className="text-sm text-slate-600">
              Se enviará a:{" "}
              <span className="font-medium text-slate-900">
                {clientEmail ||
                  (selectedClient
                    ? "este cliente no tiene correo"
                    : "selecciona un cliente")}
              </span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              La factura se guardará sin enviar correo.
            </p>
          )}
        </section>
        </div>

        {errorMessage ? (
          <p
            className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/facturas"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
