import Link from "next/link";
import type { ClientOption } from "@/components/clients/types";
import { updatePedimento } from "../../../app/dashboard/pedimentos/actions";

export type EditPedimentoInitial = {
  id: string;
  cliente_id: string | null;
  numero_pedimento: string;
  fecha: string;
  aduana: string;
  notas: string | null;
  archivo_url: string | null;
};

type EditPedimentoFormProps = {
  pedimento: EditPedimentoInitial;
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

export function EditPedimentoForm({
  pedimento,
  clients,
  errorMessage,
}: EditPedimentoFormProps) {
  const fechaInput = formatDateForInput(pedimento.fecha);
  const clienteValue = pedimento.cliente_id ?? "";

  return (
    <div className="mx-auto w-full max-w-xl font-poppins">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Editar pedimento
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Actualiza los datos o reemplaza el PDF.
        </p>
      </header>

      <form
        action={updatePedimento}
        encType="multipart/form-data"
        className="space-y-5"
      >
        <input type="hidden" name="pedimento_id" value={pedimento.id} />

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
            defaultValue={clienteValue}
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
            defaultValue={pedimento.numero_pedimento}
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
              defaultValue={fechaInput}
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
              defaultValue={pedimento.aduana}
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
            defaultValue={pedimento.notas ?? ""}
            className={`${fieldClass} min-h-[88px] resize-y`}
            placeholder="Opcional"
          />
        </div>

        {pedimento.archivo_url ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
            <span className="text-slate-600">Archivo actual: </span>
            <a
              href={pedimento.archivo_url}
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
            href="/dashboard/pedimentos"
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
