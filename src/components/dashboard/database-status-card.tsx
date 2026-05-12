"use client";

type DatabaseStatusCardProps = {
  connected: boolean;
};

export function DatabaseStatusCard({ connected }: DatabaseStatusCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 font-poppins shadow-sm">
      <h3 className="text-sm font-medium tracking-tight text-slate-900">
        Base de datos
      </h3>
      <div className="mt-2 flex flex-1 flex-col justify-center">
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-700">
              Conexión activa
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-sm"
              aria-hidden
            />
            <span className="text-xs font-medium text-slate-700">
              Error de conexión
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
