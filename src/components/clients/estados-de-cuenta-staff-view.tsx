"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Search } from "lucide-react";
import { GoogleSheetPreviewModal } from "@/components/clients/google-sheet-preview-modal";
import type { ClientEstadoDeCuentaRow } from "@/lib/client-google-spreadsheet-db";
import { spreadsheetIdFromStoredUrl } from "@/lib/google-sheets/spreadsheet-url";

type EstadosDeCuentaStaffViewProps = {
  clients: ClientEstadoDeCuentaRow[];
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

type PreviewTarget = {
  clientId: string;
  clientName: string;
  spreadsheetId: string;
  openUrl: string;
};

export function EstadosDeCuentaStaffView({
  clients,
}: EstadosDeCuentaStaffViewProps) {
  const [search, setSearch] = useState("");
  const [onlyLinked, setOnlyLinked] = useState(false);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      if (onlyLinked && !client.google_spreadsheet_url) return false;
      if (!term) return true;
      const haystack = [
        client.full_name,
        client.company_name,
        client.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search, onlyLinked]);

  function openPreview(client: ClientEstadoDeCuentaRow) {
    const spreadsheetId = spreadsheetIdFromStoredUrl(
      client.google_spreadsheet_url,
    );
    if (!spreadsheetId || !client.google_spreadsheet_url) return;
    setPreview({
      clientId: client.id,
      clientName: client.full_name,
      spreadsheetId,
      openUrl: client.google_spreadsheet_url,
    });
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className={`${fieldClass} pl-10`}
            />
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyLinked}
              onChange={(e) => setOnlyLinked(e.target.checked)}
              className="size-4 rounded border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/20"
            />
            Solo con hoja vinculada
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay clientes que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => {
                    const linked = Boolean(client.google_spreadsheet_url);
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {client.full_name}
                          </p>
                          {client.company_name ? (
                            <p className="text-xs text-slate-500">
                              {client.company_name}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {linked ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              Vinculado
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              Sin vincular
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {linked ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openPreview(client)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#227DE8] hover:underline"
                                >
                                  <Eye className="size-3.5" aria-hidden />
                                  Vista previa
                                </button>
                                <a
                                  href={client.google_spreadsheet_url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#227DE8] hover:underline"
                                >
                                  Abrir
                                  <ExternalLink className="size-3" aria-hidden />
                                </a>
                              </>
                            ) : null}
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className="text-xs font-medium text-slate-600 hover:text-[#227DE8] hover:underline"
                            >
                              Gestionar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {preview ? (
        <GoogleSheetPreviewModal
          open={Boolean(preview)}
          onClose={() => setPreview(null)}
          spreadsheetId={preview.spreadsheetId}
          openUrl={preview.openUrl}
          title={`Vista previa — ${preview.clientName}`}
        />
      ) : null}
    </>
  );
}
