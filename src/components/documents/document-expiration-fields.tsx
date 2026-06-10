"use client";

import { useMemo, useState } from "react";
import {
  calculateExpirationFromPeriod,
  VALIDITY_PERIODS,
  type ValidityPeriod,
} from "@/lib/documents-config";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type DocumentExpirationFieldsProps = {
  defaultValidoPor?: ValidityPeriod;
  defaultFechaVencimiento?: string | null;
  defaultValidoManualmente?: boolean;
  fechaSubida?: string | null;
};

function inferValidoPor(
  sinVencimiento: boolean,
  fechaVencimiento: string | null | undefined,
): ValidityPeriod {
  if (sinVencimiento) {
    return "indefinido";
  }
  if (fechaVencimiento?.trim()) {
    return "fecha_especifica";
  }
  return "1_mes";
}

export function DocumentExpirationFields({
  defaultValidoPor,
  defaultFechaVencimiento,
  defaultValidoManualmente = true,
  fechaSubida,
}: DocumentExpirationFieldsProps) {
  const initialValidoPor =
    defaultValidoPor ??
    inferValidoPor(false, defaultFechaVencimiento ?? null);

  const [validoPor, setValidoPor] = useState<ValidityPeriod>(initialValidoPor);
  const [fechaVencimiento, setFechaVencimiento] = useState(
    defaultFechaVencimiento?.slice(0, 10) ?? "",
  );
  const [validoManualmente, setValidoManualmente] = useState(
    defaultValidoManualmente,
  );

  const computedExpiration = useMemo(() => {
    if (
      validoPor === "indefinido" ||
      validoPor === "fecha_especifica"
    ) {
      return null;
    }
    const base = fechaSubida
      ? new Date(fechaSubida)
      : new Date();
    return calculateExpirationFromPeriod(base, validoPor);
  }, [validoPor, fechaSubida]);

  const resolvedFechaVencimiento =
    validoPor === "fecha_especifica"
      ? fechaVencimiento
      : validoPor === "indefinido"
        ? ""
        : (computedExpiration ?? "");

  return (
    <div className="space-y-5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
      <div>
        <h3 className="text-sm font-medium text-slate-900">
          Vigencia del documento
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Controla la fecha de vencimiento y validez por cliente.
        </p>
      </div>

      <div>
        <label
          htmlFor="valido_por"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Válido por
        </label>
        <select
          id="valido_por"
          name="valido_por"
          value={validoPor}
          onChange={(e) => setValidoPor(e.target.value as ValidityPeriod)}
          className={fieldClass}
        >
          {VALIDITY_PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      {validoPor === "fecha_especifica" ? (
        <div>
          <label
            htmlFor="fecha_vencimiento"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Fecha de vencimiento
          </label>
          <input
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className={fieldClass}
          />
        </div>
      ) : validoPor !== "indefinido" && computedExpiration ? (
        <div>
          <p className="text-sm font-medium text-slate-700">
            Fecha de vencimiento calculada
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {new Date(`${computedExpiration}T12:00:00`).toLocaleDateString(
              "es-MX",
              { day: "2-digit", month: "long", year: "numeric" },
            )}
          </p>
        </div>
      ) : validoPor === "indefinido" ? (
        <p className="text-sm text-slate-600">
          Este documento no tendrá fecha de vencimiento y permanecerá vigente
          hasta que lo modifiques manualmente.
        </p>
      ) : null}

      <input
        type="hidden"
        name="fecha_vencimiento_resolved"
        value={resolvedFechaVencimiento}
      />
      <input
        type="hidden"
        name="sin_vencimiento"
        value={validoPor === "indefinido" ? "true" : "false"}
      />

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <input
          id="valido_manualmente"
          name="valido_manualmente"
          type="checkbox"
          checked={validoManualmente}
          onChange={(e) => setValidoManualmente(e.target.checked)}
          value="true"
          className="mt-0.5 size-4 rounded border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/20"
        />
        <div>
          <label
            htmlFor="valido_manualmente"
            className="text-sm font-medium text-slate-800"
          >
            Documento válido
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Desmarca para marcar como inválido o vencido manualmente, sin
            importar la fecha.
          </p>
        </div>
      </div>
    </div>
  );
}
