"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { DodaSatStatusBadge } from "@/components/dodas/doda-sat-status-badge";
import { formatDodaDateTime } from "@/components/dodas/doda-display-utils";
import {
  UNASSIGNED_CLIENT_LABEL,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";

type DodaResultDetailModalProps = {
  doda: DodaDashboardRow | null;
  open: boolean;
  onClose: () => void;
};

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-slate-900">{value}</dd>
    </div>
  );
}

export function DodaResultDetailModal({
  doda,
  open,
  onClose,
}: DodaResultDetailModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      align="bottom-sheet"
      overlayClassName="bg-slate-900/40 backdrop-blur-[1px]"
      panelClassName="font-poppins flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
    >
      {doda ? (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="text-lg font-medium tracking-tight text-slate-900">
                Detalle del DODA
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {doda.numero_integracion ?? "Sin número de integración"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField
                label="Número de integración"
                value={doda.numero_integracion ?? "—"}
              />
              <DetailField
                label="Estado SAT"
                value={<DodaSatStatusBadge status={doda.sat_status} />}
              />
              <DetailField label="Pedimento" value={doda.pedimento ?? "—"} />
              <DetailField
                label="Tipo de pedimento"
                value={doda.tipo_pedimento ?? "—"}
              />
              <DetailField
                label="Remesas presentadas"
                value={doda.remesas_presentadas ?? "—"}
              />
              <DetailField
                label="Clave de pedimento"
                value={doda.clave_pedimento ?? "—"}
              />
              <DetailField
                label="Datos de identificación del vehículo"
                value={doda.datos_vehiculo ?? "—"}
              />
              <DetailField
                label="Cantidad de mercancía"
                value={doda.cantidad_mercancia ?? "—"}
              />
              <DetailField label="Remesa de consolidado" value="—" />
              <DetailField
                label="Cliente asociado"
                value={doda.client_name ?? UNASSIGNED_CLIENT_LABEL}
              />
              <DetailField
                label="Fecha de consulta"
                value={formatDodaDateTime(doda.looked_up_at)}
              />
              <DetailField
                label="URL del validador SAT"
                value={
                  doda.qr_validator_url ? (
                    <a
                      href={doda.qr_validator_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-medium text-[#227DE8] underline-offset-2 hover:underline"
                    >
                      {doda.qr_validator_url}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </div>
        </>
      ) : null}
    </ModalShell>
  );
}
