import { ExternalLink, Sheet } from "lucide-react";

type ClientEstadoDeCuentaLinkProps = {
  spreadsheetUrl: string | null;
};

export function ClientEstadoDeCuentaLink({
  spreadsheetUrl,
}: ClientEstadoDeCuentaLinkProps) {
  if (!spreadsheetUrl) {
    return (
      <section className="font-poppins mb-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
          <Sheet className="size-5 text-slate-400" aria-hidden />
          Estado de cuenta
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Aún no tienes estado de cuenta. Cuando Chavarrias vincule tu hoja,
          podrás consultarla aquí.
        </p>
      </section>
    );
  }

  return (
    <section className="font-poppins mb-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            <Sheet className="size-5 text-[#227DE8]" aria-hidden />
            Estado de cuenta
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Tu estado de cuenta es siempre el mismo archivo, actualizado por
            Chavarrias. Aquí solo puedes consultarlo (no editarlo).
          </p>
        </div>
        <a
          href={spreadsheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4]"
        >
          Ver mi estado de cuenta
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
    </section>
  );
}
