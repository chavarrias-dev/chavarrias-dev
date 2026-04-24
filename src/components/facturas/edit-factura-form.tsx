import Link from "next/link";
import type { ClientOption } from "@/components/clients/types";
import { updateFactura } from "../../../app/dashboard/facturas/actions";

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
        encType="multipart/form-data"
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
            <input
              id="fecha"
              name="fecha"
              type="date"
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
            Notas
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={3}
            defaultValue={factura.notas ?? ""}
            className={`${fieldClass} min-h-[88px] resize-y`}
            placeholder="Opcional"
          />
        </div>

        {factura.archivo_url ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
            <span className="text-slate-600">Archivo actual: </span>
            <a
              href={factura.archivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
            >
              Ver PDF actual
            </a>
          </div>
        ) : null}

        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-slate-700">
            Reemplazar PDF (opcional)
          </label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Si subes un archivo nuevo, sustituye al PDF anterior en el almacenamiento.
          </p>
        </div>

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
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
