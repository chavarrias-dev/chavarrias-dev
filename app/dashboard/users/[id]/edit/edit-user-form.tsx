"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProfileRole } from "@/lib/supabase/middleware";
import { updateUser } from "../../actions";

type EditUserFormProps = {
  userId: string;
  initialFullName: string;
  initialEmail: string;
  initialRole: ProfileRole | null;
  initialPhone: string;
  initialCompanyName: string;
  initialRfc: string;
  errorMessage?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function EditUserForm({
  userId,
  initialFullName,
  initialEmail,
  initialRole,
  initialPhone,
  initialCompanyName,
  initialRfc,
  errorMessage,
}: EditUserFormProps) {
  const [role, setRole] = useState<ProfileRole>(
    initialRole ?? "empleado",
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Editar usuario
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Actualiza datos del usuario y la cuenta asociada.
        </p>
      </header>

      <form action={updateUser} className="space-y-5">
        <input type="hidden" name="user_id" value={userId} />

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
            defaultValue={initialFullName}
            className={inputClass}
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
            defaultValue={initialEmail}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            className={inputClass}
            placeholder="Dejar vacío para no cambiar"
          />
          <p className="mt-1 text-xs text-slate-500">
            Solo si necesitas restablecer la contraseña (mín. 6 caracteres).
          </p>
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
            defaultValue={initialPhone}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Rol <span className="text-red-600">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole)}
            className={inputClass}
          >
            <option value="admin">Administrador</option>
            <option value="empleado">Empleado</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>

        {role === "cliente" ? (
          <>
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
                defaultValue={initialCompanyName}
                className={inputClass}
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
                defaultValue={initialRfc}
                className={inputClass}
              />
            </div>
          </>
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
            href="/dashboard/users"
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
