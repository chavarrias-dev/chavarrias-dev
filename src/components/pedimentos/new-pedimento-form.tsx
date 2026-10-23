import Link from "next/link";
import { ArchiveFileInput } from "@/components/files/archive-file-input";
import type { ClientOption } from "@/components/clients/types";
import { PedimentoNumberFields } from "@/components/pedimentos/pedimento-number-fields";
import { savePedimento } from "../../../app/dashboard/pedimentos/actions";

type NewPedimentoFormProps = {
  clients: ClientOption[];
  errorMessage?: string;
  /** Pre-select cliente when linked from client profile (?cliente_id=…) */
  defaultClienteId?: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function NewPedimentoForm({
  clients,
  errorMessage,
  defaultClienteId,
}: NewPedimentoFormProps) {
  const clienteDefault =
    defaultClienteId &&
    clients.some((c) => c.id === defaultClienteId)
      ? defaultClienteId
      : "";

  return (
    <div className="mx-auto w-full max-w-xl font-poppins">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Nuevo pedimento
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Registra un pedimento y adjunta PDF, ZIP o RAR si lo tienes.
        </p>
      </header>

      <form action={savePedimento} className="space-y-5">
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
            defaultValue={clienteDefault}
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

        <PedimentoNumberFields />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="fecha"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Fecha de apertura <span className="text-red-600">*</span>
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="fecha_cierre"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Fecha de cierre
            </label>
            <input
              id="fecha_cierre"
              name="fecha_cierre"
              type="date"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="aduana"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Aduana <span className="text-red-600">*</span>
          </label>
          <input
            id="aduana"
            name="aduana"
            type="text"
            required
            className={fieldClass}
            placeholder="Ej. Veracruz"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Nombre de la aduana, aparte de la clave de 2 dígitos del número.
          </p>
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
          />
        </div>

        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-slate-700">
            Archivo (PDF, ZIP o RAR)
          </label>
          <ArchiveFileInput id="archivo" folder="pedimentos" />
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
            href="/dashboard/pedimentos"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
          >
            Guardar pedimento
          </button>
        </div>
      </form>
    </div>
  );
}
