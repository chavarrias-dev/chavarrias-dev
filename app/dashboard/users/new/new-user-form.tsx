"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProfileRole } from "@/lib/supabase/middleware";
import { createUser } from "../actions";

type NewUserFormProps = {
  errorMessage?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function NewUserForm({ errorMessage }: NewUserFormProps) {
  const [role, setRole] = useState<ProfileRole>("empleado");

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Nuevo usuario
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Crea una cuenta en Supabase Auth y perfil en el CRM.
        </p>
      </header>

      <form action={createUser} className="space-y-5">
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
            className={inputClass}
            placeholder="correo@empresa.com"
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

        {role !== "cliente" ? (
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Contraseña <span className="text-red-600">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200/90 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
            Para clientes no se define contraseña aquí: recibirán un correo para
            establecerla.
          </p>
        )}

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
            className={inputClass}
            placeholder="+52 …"
          />
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
                className={inputClass}
                placeholder="Opcional"
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
            Crear usuario
          </button>
        </div>
      </form>
    </div>
  );
}
