"use client";

import { useRef, useState } from "react";
import { parsePedimentoNumber } from "@/lib/pedimento-number";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center font-mono text-[15px] tracking-wide text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type PedimentoNumberFieldsProps = {
  initialValue?: string;
};

export function PedimentoNumberFields({
  initialValue = "",
}: PedimentoNumberFieldsProps) {
  const initial = parsePedimentoNumber(initialValue);
  const [anio, setAnio] = useState(initial.anio);
  const [aduana, setAduana] = useState(initial.aduana);
  const [agente, setAgente] = useState(initial.agente);
  const [consecutivo, setConsecutivo] = useState(initial.consecutivo);

  const aduanaRef = useRef<HTMLInputElement>(null);
  const agenteRef = useRef<HTMLInputElement>(null);
  const consecutivoRef = useRef<HTMLInputElement>(null);

  function setDigits(
    raw: string,
    max: number,
    setValue: (value: string) => void,
    next?: HTMLInputElement | null,
  ) {
    const digits = raw.replace(/\D/g, "").slice(0, max);
    setValue(digits);
    if (digits.length === max) {
      next?.focus();
    }
  }

  const preview = [anio, aduana, agente, consecutivo].filter(Boolean).join(" ");
  const storedUnparsed =
    initialValue.trim().length > 0 &&
    !initial.anio &&
    !initial.aduana &&
    !initial.agente &&
    !initial.consecutivo;

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate-700">
        Número de pedimento <span className="text-red-600">*</span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[5.5rem_5.5rem_7rem_1fr]">
        <div>
          <label
            htmlFor="pedimento_anio"
            className="mb-1 block text-xs font-medium text-slate-500"
          >
            Año
          </label>
          <input
            id="pedimento_anio"
            name="pedimento_anio"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={2}
            maxLength={2}
            pattern="\d{2}"
            value={anio}
            onChange={(event) =>
              setDigits(event.target.value, 2, setAnio, aduanaRef.current)
            }
            className={fieldClass}
            placeholder="24"
            aria-describedby="pedimento-numero-ayuda"
          />
        </div>
        <div>
          <label
            htmlFor="pedimento_aduana"
            className="mb-1 block text-xs font-medium text-slate-500"
          >
            Aduana
          </label>
          <input
            ref={aduanaRef}
            id="pedimento_aduana"
            name="pedimento_aduana"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={2}
            maxLength={2}
            pattern="\d{2}"
            value={aduana}
            onChange={(event) =>
              setDigits(event.target.value, 2, setAduana, agenteRef.current)
            }
            className={fieldClass}
            placeholder="48"
          />
        </div>
        <div>
          <label
            htmlFor="pedimento_agente"
            className="mb-1 block text-xs font-medium text-slate-500"
          >
            Agente
          </label>
          <input
            ref={agenteRef}
            id="pedimento_agente"
            name="pedimento_agente"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={4}
            maxLength={4}
            pattern="\d{4}"
            value={agente}
            onChange={(event) =>
              setDigits(
                event.target.value,
                4,
                setAgente,
                consecutivoRef.current,
              )
            }
            className={fieldClass}
            placeholder="3512"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label
            htmlFor="pedimento_consecutivo"
            className="mb-1 block text-xs font-medium text-slate-500"
          >
            Número
          </label>
          <input
            ref={consecutivoRef}
            id="pedimento_consecutivo"
            name="pedimento_consecutivo"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={6}
            maxLength={8}
            pattern="\d{6,8}"
            value={consecutivo}
            onChange={(event) =>
              setDigits(event.target.value, 8, setConsecutivo)
            }
            className={fieldClass}
            placeholder="8000892"
          />
        </div>
      </div>
      <p id="pedimento-numero-ayuda" className="mt-1.5 text-xs text-slate-500">
        2 del año, 2 de aduana, 4 del agente y de 6 a 8 del número.
        {preview
          ? ` Se guarda como ${preview}.`
          : " Ejemplo: 24 48 3512 8000892."}
        {storedUnparsed ? ` El valor actual «${initialValue.trim()}» no coincide con ese formato.` : ""}
      </p>
    </div>
  );
}
