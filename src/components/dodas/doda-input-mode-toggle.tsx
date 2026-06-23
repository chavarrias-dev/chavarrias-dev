"use client";

type DodaInputMode = "file" | "number";

type DodaInputModeToggleProps = {
  mode: DodaInputMode;
  onChange: (mode: DodaInputMode) => void;
  disabled?: boolean;
};

export function DodaInputModeToggle({
  mode,
  onChange,
  disabled = false,
}: DodaInputModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("file")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          mode === "file"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        } disabled:opacity-50`}
      >
        Subir archivo
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("number")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          mode === "number"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        } disabled:opacity-50`}
      >
        Ingresar número
      </button>
    </div>
  );
}

export type { DodaInputMode };
