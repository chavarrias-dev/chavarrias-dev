import Link from "next/link";
import { updateClient } from "../../../app/dashboard/clients/actions";

export type EditClientInitial = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  rfc: string | null;
  notes: string | null;
};

type EditClientFormProps = {
  client: EditClientInitial;
  errorMessage?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function EditClientForm({ client, errorMessage }: EditClientFormProps) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Editar cliente
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Actualiza los datos del contacto o empresa.
        </p>
      </header>

      <form action={updateClient} className="space-y-5">
        <input type="hidden" name="client_id" value={client.id} />

        <div>
          <label
            htmlFor="full_name"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Nombre completo <span className="text-red-600">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            defaultValue={client.full_name}
            className={inputClass}
            placeholder="Nombre y apellidos"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Correo electrónico <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={client.email}
            className={inputClass}
            placeholder="correo@empresa.com"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={client.phone ?? ""}
            className={inputClass}
            placeholder="+52 …"
          />
        </div>

        <div>
          <label
            htmlFor="company_name"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Empresa
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            autoComplete="organization"
            defaultValue={client.company_name ?? ""}
            className={inputClass}
            placeholder="Razón social o nombre comercial"
          />
        </div>

        <div>
          <label
            htmlFor="rfc"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            RFC
          </label>
          <input
            id="rfc"
            name="rfc"
            type="text"
            defaultValue={client.rfc ?? ""}
            className={inputClass}
            placeholder="Opcional"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Notas
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={client.notes ?? ""}
            className={`${inputClass} resize-y min-h-[100px]`}
            placeholder="Observaciones internas…"
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
            href="/dashboard/clients"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#227DE8]/30"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
