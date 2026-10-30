"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClientOption } from "@/components/clients/types";
import { FacturaArchiveFilesInput } from "@/components/files/factura-archive-files-input";
import { FacturaCorreosAdicionalesField } from "@/components/facturas/factura-correos-adicionales-field";
import {
  buildFacturaEmailRecipients,
  formatFacturaRecipientsForDisplay,
  parseFacturaExtraEmails,
} from "@/lib/factura-email-recipients";
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

const panelClass =
  "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5";

function PanelHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 border-b border-slate-100 pb-3">
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

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
  const [sendEmail, setSendEmail] = useState(true);
  const [correosAdicionales, setCorreosAdicionales] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const selectedClient = clients.find((client) => client.id === clienteId) ?? null;
  const clientEmail = selectedClient?.email?.trim() ?? "";
  const submitLabel = sendEmail
    ? "Guardar y enviar por email"
    : "Guardar factura";

  const recipientPreview = useMemo(() => {
    if (!sendEmail) return "";
    return formatFacturaRecipientsForDisplay(
      buildFacturaEmailRecipients(
        clientEmail,
        parseFacturaExtraEmails(correosAdicionales),
      ),
    );
  }, [sendEmail, clientEmail, correosAdicionales]);

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
          Registra la factura, redacta el correo y configura cliente, archivos y
          destinatarios.
        </p>
      </header>

      <form action={saveFactura} className="flex flex-col gap-5 pb-28 sm:pb-0">
        <input type="hidden" name="enviar_email" value={sendEmail ? "1" : "0"} />

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-x-8">
        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1">
        <section className={`${panelClass} space-y-4`}>
          <PanelHeading
            title="Factura"
            description="Número, fecha y monto registrados en el sistema."
          />

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

        <section className={`${panelClass} space-y-3`}>
          <PanelHeading
            title="Mensaje del correo"
            description="Texto que verá el cliente. Se guarda con la factura."
          />

          <div>
            <label
              htmlFor="notas"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Cuerpo del email
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
        </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-2">
        <section className={`${panelClass} space-y-4`}>
          <PanelHeading
            title="Cliente"
            description="Quién recibe la factura y el correo principal."
          />

          <div>
            <label
              htmlFor="cliente_id"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Seleccionar cliente <span className="text-red-600">*</span>
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
                Elige un cliente
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {selectedClient ? (
            <dl className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Empresa</dt>
                <dd className="font-medium text-slate-900">
                  {selectedClient.company_name?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Correo</dt>
                <dd className="font-medium text-slate-900">
                  {clientEmail || "Sin correo registrado"}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className={`${panelClass} space-y-4`}>
          <PanelHeading
            title="Archivos adjuntos"
            description="Hasta 10 archivos; en el sistema se guardan en un solo ZIP."
          />

          <FacturaArchiveFilesInput
            id="archivo"
            onPdfSelected={(file) => {
              setSelectedFile(file);
              setScanMessage(null);
              setScanError(null);
            }}
          />

          {selectedFile ? (
            <button
              type="button"
              disabled={isScanning}
              onClick={() => void handleScanPdf()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#227DE8]/50 bg-[#227DE8]/5 px-4 text-sm font-medium text-[#227DE8] transition-colors hover:bg-[#227DE8]/10 disabled:opacity-60 sm:w-auto"
            >
              {isScanning ? "Extrayendo…" : "Escanear primer PDF con IA"}
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

        <section className={`${panelClass} space-y-4`}>
          <PanelHeading
            title="Envío por correo"
            description="El cliente siempre va en copia; puedes sumar más destinatarios."
          />

          <FacturaCorreosAdicionalesField
            hidePrimaryEmail
            clientEmail={clientEmail}
            value={correosAdicionales}
            onValueChange={setCorreosAdicionales}
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/30"
            />
            <span className="text-sm leading-snug text-slate-800">
              <span className="font-medium">Enviar al guardar</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Incluye adjuntos y el mensaje configurado a la izquierda.
              </span>
            </span>
          </label>

          <div
            className={`rounded-lg px-3.5 py-2.5 text-sm ${
              sendEmail
                ? "border border-[#227DE8]/20 bg-[#227DE8]/5 text-slate-800"
                : "border border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {sendEmail ? (
              <>
                <span className="text-xs font-medium uppercase tracking-wide text-[#227DE8]">
                  Para
                </span>
                <p className="mt-1 font-medium text-slate-900">
                  {recipientPreview ||
                    (selectedClient
                      ? "Agrega correo al cliente"
                      : "Selecciona un cliente")}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed">
                Solo se guardará la factura. Los destinatarios extra quedan
                registrados para reenviar después.
              </p>
            )}
          </div>
        </section>
        </div>
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
