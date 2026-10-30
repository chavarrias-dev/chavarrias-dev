import { FACTURA_MAX_EXTRA_EMAILS } from "@/lib/factura-email-recipients";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type FacturaCorreosAdicionalesFieldProps = {
  id?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  clientEmail?: string;
  disabled?: boolean;
  /** Oculta el bloque del correo del cliente (si ya se muestra arriba). */
  hidePrimaryEmail?: boolean;
};

export function FacturaCorreosAdicionalesField({
  id = "correos_adicionales",
  defaultValue = "",
  value,
  onValueChange,
  clientEmail,
  disabled = false,
  hidePrimaryEmail = false,
}: FacturaCorreosAdicionalesFieldProps) {
  return (
    <div className="space-y-3">
      {!hidePrimaryEmail ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
          <p className="text-xs font-medium text-slate-500">Correo del cliente</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {clientEmail?.trim() || "Selecciona un cliente con correo"}
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          Otros destinatarios{" "}
          <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id={id}
          name="correos_adicionales"
          rows={3}
          disabled={disabled}
          {...(value !== undefined
            ? {
                value,
                onChange: (event) => onValueChange?.(event.target.value),
              }
            : { defaultValue })}
          placeholder={"contabilidad@empresa.com\ncobranza@empresa.com"}
          className={`${fieldClass} min-h-[88px] resize-y font-mono text-[13px]`}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Un correo por línea, máximo {FACTURA_MAX_EXTRA_EMAILS}.
        </p>
      </div>
    </div>
  );
}
