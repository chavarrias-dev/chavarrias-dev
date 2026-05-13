"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExtractedConstanciaData } from "@/lib/extract-constancia-types";
import type { ProfileRole } from "@/lib/supabase/profile-role";
import { createUser } from "../actions";

type NewUserFormProps = {
  errorMessage?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function fullNameFromExtracted(d: ExtractedConstanciaData): string {
  const parts = [d.nombre, d.primer_apellido, d.segundo_apellido].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return parts.join(" ").trim();
}

export function NewUserForm({ errorMessage }: NewUserFormProps) {
  const [role, setRole] = useState<ProfileRole>("empleado");
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const [fullName, setFullName] = useState("");
  const [rfc, setRfc] = useState("");
  const [curp, setCurp] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extractOk, setExtractOk] = useState(false);
  const [extractErr, setExtractErr] = useState<string | null>(null);

  async function onConstanciaSelected(file: File | undefined) {
    setExtractOk(false);
    setExtractErr(null);
    if (!file || file.size === 0) {
      return;
    }
    if (file.type !== "application/pdf") {
      setExtractErr("Solo se permiten archivos PDF.");
      return;
    }

    setExtracting(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/extract-constancia", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as
        | { data: ExtractedConstanciaData }
        | { error?: string };

      if (!res.ok || !("data" in json)) {
        setExtractErr(
          "error" in json && json.error
            ? json.error
            : "No se pudieron extraer los datos.",
        );
        return;
      }

      const d = json.data;
      const joined = fullNameFromExtracted(d);
      if (joined) {
        setFullName(joined);
      }
      setRfc(d.rfc ?? "");
      setCurp(d.curp ?? "");
      setCodigoPostal(d.codigo_postal ?? "");
      setDireccion(d.direccion ?? "");
      setFechaInicio(d.fecha_inicio_operaciones ?? "");
      setExtractOk(true);
    } catch {
      setExtractErr("Error de red al extraer la constancia.");
    } finally {
      setExtracting(false);
    }
  }

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

      <form
        action={createUser}
        encType="multipart/form-data"
        className="space-y-5"
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          const pw = fd.get("password");
          const pw2 = fd.get("password_confirm");
          if (pw !== pw2) {
            e.preventDefault();
            setPasswordMismatch(true);
            return;
          }
          setPasswordMismatch(false);
        }}
      >
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
            onChange={(e) => {
              const next = e.target.value as ProfileRole;
              setRole(next);
              if (next !== "cliente") {
                setExtractOk(false);
                setExtractErr(null);
                setExtracting(false);
              }
            }}
            className={inputClass}
          >
            <option value="admin">Administrador</option>
            <option value="empleado">Empleado</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>

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
            onChange={() => setPasswordMismatch(false)}
          />
        </div>

        <div>
          <label
            htmlFor="password_confirm"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Confirmar contraseña <span className="text-red-600">*</span>
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            className={inputClass}
            placeholder="Repite la contraseña"
            onChange={() => setPasswordMismatch(false)}
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
                htmlFor="constancia_fiscal"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Constancia de Situación Fiscal (opcional)
              </label>
              <input
                id="constancia_fiscal"
                name="constancia_fiscal"
                type="file"
                accept="application/pdf,.pdf"
                className={`${inputClass} py-2 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700`}
                onChange={(e) => {
                  void onConstanciaSelected(e.target.files?.[0]);
                }}
              />
              {extracting ? (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-[#227DE8] border-t-transparent"
                    aria-hidden
                  />
                  <span>Extrayendo datos…</span>
                </div>
              ) : null}
              {extractOk ? (
                <p
                  className="mt-2 rounded-lg border border-emerald-200/90 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                  role="status"
                >
                  Datos extraídos de la constancia
                </p>
              ) : null}
              {extractErr ? (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {extractErr}
                </p>
              ) : null}
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
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="curp"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                CURP
              </label>
              <input
                id="curp"
                name="curp"
                type="text"
                className={inputClass}
                placeholder="Opcional"
                value={curp}
                onChange={(e) => setCurp(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="codigo_postal"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Código postal
              </label>
              <input
                id="codigo_postal"
                name="codigo_postal"
                type="text"
                inputMode="numeric"
                className={inputClass}
                placeholder="Opcional"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="direccion"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Dirección fiscal
              </label>
              <textarea
                id="direccion"
                name="direccion"
                rows={3}
                className={`${inputClass} resize-y`}
                placeholder="Opcional"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="fecha_inicio_operaciones"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Fecha inicio de operaciones
              </label>
              <input
                id="fecha_inicio_operaciones"
                name="fecha_inicio_operaciones"
                type="text"
                className={inputClass}
                placeholder="Opcional"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {passwordMismatch ? (
          <p
            className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
            role="alert"
          >
            Las contraseñas no coinciden.
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
