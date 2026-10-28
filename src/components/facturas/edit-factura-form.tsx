import Link from "next/link";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import { ArchiveFileInput } from "@/components/files/archive-file-input";
import { MxDateInput } from "@/components/forms/mx-date-input";
import type { ClientOption } from "@/components/clients/types";
import {
  resendFacturaEmail,
  updateFactura,
} from "../../../app/dashboard/facturas/actions";

export type EditFacturaInitial = {
  id: string;
  cliente_id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  notas: string | null;
  archivo_url: string | null;
};

type EditFacturaFormProps = {
  factura: EditFacturaInitial;
  clients: ClientOption[];
  errorMessage?: string;
  noticeMessage?: string;
  noticeError?: boolean;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function formatDateForInput(isoOrDate: string): string {
  if (!isoOrDate) return "";
  const d = isoOrDate.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function formatMontoForInput(monto: string): string {
  const n = Number.parseFloat(monto);
  if (!Number.isFinite(n)) return monto;
  return String(n);
}

export function EditFacturaForm({
  factura,
  clients,
  errorMessage,
  noticeMessage,
  noticeError,
}: EditFacturaFormProps) {
  const fechaInput = formatDateForInput(factura.fecha);
  const montoInput = formatMontoForInput(factura.monto);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Editar factura
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Actualiza los datos o reemplaza el PDF.
        </p>
      </header>

      <form
        action={updateFactura}
        className="space-y-5"
      >
        <input type="hidden" name="factura_id" value={factura.id} />

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
            defaultValue={factura.cliente_id}
          >
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
            defaultValue={factura.numero_factura}
            className={fieldClass}
            placeholder="Ej. A-1234"
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
            <MxDateInput
              id="fecha"
              name="fecha"
              required
              defaultValue={fechaInput}
              className={fieldClass}
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
              defaultValue={montoInput}
              className={fieldClass}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notas" className="mb-1.5 block text-sm font-medium text-slate-700">
            Descripción para correo{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={4}
            defaultValue={factura.notas ?? ""}
            className={`${fieldClass} min-h-[96px] resize-y font-mono text-[13px]`}
            placeholder={"Datos para pago, banco, CLABE u otras líneas extra.\nDeja vacío si no aplica."}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Texto libre que aparece en el email del cliente (variable{" "}
            <code className="rounded bg-slate-100 px-1">{`{{descripcion_correo}}`}</code>
            ).
          </p>
        </div>

        {factura.archivo_url ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
            <span className="text-slate-600">Archivo actual: </span>
            <ArchiveFileLink href={factura.archivo_url} current />
          </div>
        ) : null}

        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-slate-700">
            Reemplazar archivo (PDF, ZIP o RAR, opcional)
          </label>
          <ArchiveFileInput id="archivo" folder="facturas" />
          <p className="mt-1.5 text-xs text-slate-500">
            Si subes un archivo nuevo, sustituye al archivo anterior en el almacenamiento.
          </p>
        </div>

        {noticeMessage ? (
          <p
            className={`rounded-lg border px-3.5 py-2.5 text-sm ${
              noticeError
                ? "border-amber-200/90 bg-amber-50/90 text-amber-950"
                : "border-emerald-200/90 bg-emerald-50/90 text-emerald-900"
            }`}
            role={noticeError ? "alert" : "status"}
          >
            {noticeMessage}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
          <input
            type="checkbox"
            name="enviar_correo"
            value="1"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/30"
          />
          <span className="text-sm text-slate-700">
            Enviar correo al guardar (misma plantilla con firma de facturación)
          </span>
        </label>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
            Guardar cambios
          </button>
        </div>
      </form>

      <form action={resendFacturaEmail} className="mt-6 border-t border-slate-200 pt-6">
        <input type="hidden" name="factura_id" value={factura.id} />
        <p className="mb-3 text-sm text-slate-600">
          Reenvía el correo con la factura actual sin modificar los datos.
        </p>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#227DE8] bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5"
        >
          Reenviar correo al cliente
        </button>
      </form>
    </div>
  );
}
