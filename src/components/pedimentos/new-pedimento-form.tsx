import Link from "next/link";
import type { ClientOption } from "@/components/clients/types";
import { savePedimento } from "../../../app/dashboard/pedimentos/actions";

type NewPedimentoFormProps = {
  clients: ClientOption[];
  errorMessage?: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function NewPedimentoForm({
  clients,
  errorMessage,
}: NewPedimentoFormProps) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Nuevo pedimento
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Registra un pedimento y adjunta el PDF si lo tienes.
        </p>
      </header>

      <form
        action={savePedimento}
        encType="multipart/form-data"
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="cliente_id"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Cliente
          </label>
          <select id="cliente_id" name="cliente_id" className={fieldClass}>
            <option value="">Sin cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="numero_pedimento"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Número de pedimento <span className="text-red-600">*</span>
          </label>
          <input
            id="numero_pedimento"
            name="numero_pedimento"
            type="text"
            required
            className={fieldClass}
            placeholder="Ej. 24  48  3512  8000892"
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
            />
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
          />
        </div>

        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-slate-700">
            PDF del pedimento
          </label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#227DE8]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#227DE8] transition-all duration-200 file:transition-colors hover:file:bg-[#227DE8]/20"
          />
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
