import Link from "next/link";
import { ArchiveFileLink } from "@/components/files/archive-file-link";
import { ArchiveFileInput } from "@/components/files/archive-file-input";
import type { ClientOption } from "@/components/clients/types";
import { PedimentoNumberFields } from "@/components/pedimentos/pedimento-number-fields";
import { updatePedimento } from "../../../app/dashboard/pedimentos/actions";

export type EditPedimentoInitial = {
  id: string;
  cliente_id: string | null;
  numero_pedimento: string;
  fecha: string;
  fecha_cierre: string | null;
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
  const fechaCierreInput = formatDateForInput(pedimento.fecha_cierre ?? "");
  const clienteValue = pedimento.cliente_id ?? "";

  return (
    <div className="mx-auto w-full max-w-xl font-poppins">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Editar pedimento
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Actualiza los datos o reemplaza el archivo adjunto.
        </p>
      </header>

      <form
        action={updatePedimento}
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

        <PedimentoNumberFields initialValue={pedimento.numero_pedimento} />

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
              defaultValue={fechaInput}
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
              defaultValue={fechaCierreInput}
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
            defaultValue={pedimento.aduana}
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
            defaultValue={pedimento.notas ?? ""}
            className={`${fieldClass} min-h-[88px] resize-y`}
            placeholder="Opcional"
          />
        </div>

        {pedimento.archivo_url ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
            <span className="text-slate-600">Archivo actual: </span>
            <ArchiveFileLink href={pedimento.archivo_url} current />
          </div>
        ) : null}

        <div>
          <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-slate-700">
            Reemplazar archivo (PDF, ZIP o RAR, opcional)
          </label>
          <ArchiveFileInput id="archivo" folder="pedimentos" />
          <p className="mt-1.5 text-xs text-slate-500">
            Si subes un archivo nuevo, sustituye al archivo anterior en el almacenamiento.
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
