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
  compact?: boolean;
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
  return "indefinido";
}

export function DocumentExpirationFields({
  defaultValidoPor,
  defaultFechaVencimiento,
  defaultValidoManualmente = true,
  fechaSubida,
  compact = false,
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

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "space-y-5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
      }
    >
      {!compact ? (
        <div>
          <h3 className="text-sm font-medium text-slate-900">
            Vigencia del documento
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Controla la fecha de vencimiento y validez por cliente.
          </p>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="validityPeriod"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Válido por
        </label>
        <select
          id="validityPeriod"
          name="validityPeriod"
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
            htmlFor="fechaEspecifica"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Fecha de vencimiento
          </label>
          <input
            id="fechaEspecifica"
            name="fechaEspecifica"
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

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <input
          id="validoManualmente"
          name="validoManualmente"
          type="checkbox"
          checked={validoManualmente}
          onChange={(e) => setValidoManualmente(e.target.checked)}
          value="true"
          className="mt-0.5 size-4 rounded border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/20"
        />
        <div>
          <label
            htmlFor="validoManualmente"
            className="text-sm font-medium text-slate-800"
          >
            Válido manualmente
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
