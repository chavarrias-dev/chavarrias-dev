"use client";

import { useState } from "react";
import {
  TIPO_RAZON_SOCIAL_OTRO,
  TIPOS_RAZON_SOCIAL,
  splitTipoRazonSocial,
} from "@/lib/client-company";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type ClientCompanyFieldsProps = {
  companyName?: string;
  tipoRazonSocial?: string | null;
  puesto?: string | null;
};

export function ClientCompanyFields({
  companyName = "",
  tipoRazonSocial = null,
  puesto = "",
}: ClientCompanyFieldsProps) {
  const initialTipo = splitTipoRazonSocial(tipoRazonSocial);
  const [tipo, setTipo] = useState(initialTipo.tipo);
  const [otro, setOtro] = useState(initialTipo.otro);

  return (
    <>
      <div>
        <label
          htmlFor="company_name"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Nombre de la empresa <span className="text-red-600">*</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          autoComplete="organization"
          defaultValue={companyName}
          className={inputClass}
          placeholder="Nombre comercial o razón social"
        />
      </div>

      <div>
        <label
          htmlFor="tipo_razon_social"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Tipo de razón social <span className="text-red-600">*</span>
        </label>
        <select
          id="tipo_razon_social"
          name="tipo_razon_social"
          required
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className={inputClass}
        >
          <option value="">Selecciona un tipo</option>
          {TIPOS_RAZON_SOCIAL.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value={TIPO_RAZON_SOCIAL_OTRO}>Otro</option>
        </select>
      </div>

      {tipo === TIPO_RAZON_SOCIAL_OTRO ? (
        <div>
          <label
            htmlFor="tipo_razon_social_otro"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Especifica el tipo de razón social{" "}
            <span className="text-red-600">*</span>
          </label>
          <input
            id="tipo_razon_social_otro"
            name="tipo_razon_social_otro"
            type="text"
            required
            value={otro}
            onChange={(e) => setOtro(e.target.value)}
            className={inputClass}
            placeholder="Ej. Cooperativa"
          />
        </div>
      ) : null}

      <div>
        <label
          htmlFor="puesto"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Puesto en la empresa <span className="text-red-600">*</span>
        </label>
        <input
          id="puesto"
          name="puesto"
          type="text"
          required
          autoComplete="organization-title"
          defaultValue={puesto ?? ""}
          className={inputClass}
          placeholder="Ej. Representante legal, gerente de tráfico"
        />
      </div>
    </>
  );
}
