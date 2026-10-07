"use client";

import { DodaSatStatusBadge } from "@/components/dodas/doda-sat-status-badge";
import {
  DodaMobileActions,
  DodaMobileCard,
  DodaMobileCardTitle,
  DodaMobileKv,
} from "@/components/dodas/doda-mobile-ui";
import {
  formatDodaDateTime,
  formatDodaTime,
  getDodaConfirmationDate,
} from "@/components/dodas/doda-display-utils";
import {
  UNASSIGNED_CLIENT_LABEL,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";
import type { DodaRecord } from "@/lib/doda-types";

type ResolvedLike = Pick<
  DodaRecord,
  | "numero_integracion"
  | "sat_status"
  | "pedimento"
  | "tipo_pedimento"
  | "remesas_presentadas"
  | "clave_pedimento"
  | "datos_vehiculo"
  | "cantidad_mercancia"
  | "looked_up_at"
  | "last_checked_at"
  | "created_at"
  | "qr_validator_url"
  | "lookup_status"
  | "lookup_error"
  | "is_monitored"
  | "is_resolved"
> & {
  client_name?: string | null;
};

type DodaResolvedMobileCardProps = {
  doda: ResolvedLike;
  id?: string;
  onViewDetail?: (doda: DodaDashboardRow) => void;
  compact?: boolean;
};

export function DodaResolvedMobileCard({
  doda,
  id,
  onViewDetail,
  compact = false,
}: DodaResolvedMobileCardProps) {
  const confirmedAt = getDodaConfirmationDate(doda);

  return (
    <DodaMobileCard id={id} accentClass="border-l-4 border-emerald-400 bg-white">
      <div className="flex items-start justify-between gap-2">
        <DodaMobileCardTitle>
          {doda.numero_integracion ?? "—"}
        </DodaMobileCardTitle>
        <DodaSatStatusBadge status={doda.sat_status} />
      </div>

      <div className="mt-2 space-y-0.5">
        <DodaMobileKv label="Pedimento">{doda.pedimento ?? "—"}</DodaMobileKv>
        <DodaMobileKv label="Tipo">{doda.tipo_pedimento ?? "—"}</DodaMobileKv>
        {!compact ? (
          <>
            <DodaMobileKv label="Remesas">
              {doda.remesas_presentadas ?? "—"}
            </DodaMobileKv>
            <DodaMobileKv label="Clave">
              {doda.clave_pedimento ?? "—"}
            </DodaMobileKv>
            <DodaMobileKv label="Cantidad">
              {doda.cantidad_mercancia ?? "—"}
            </DodaMobileKv>
          </>
        ) : null}
        <DodaMobileKv label="Vehículo">
          <span className="break-words">{doda.datos_vehiculo ?? "—"}</span>
        </DodaMobileKv>
        <DodaMobileKv label="Cliente">
          {doda.client_name?.trim() || UNASSIGNED_CLIENT_LABEL}
        </DodaMobileKv>
        <DodaMobileKv label="Confirmado">
          {confirmedAt
            ? compact
              ? formatDodaTime(confirmedAt)
              : formatDodaDateTime(confirmedAt)
            : "—"}
        </DodaMobileKv>
      </div>

      {onViewDetail ? (
        <DodaMobileActions>
          <button
            type="button"
            onClick={() => onViewDetail(doda as DodaDashboardRow)}
            className="inline-flex w-full items-center justify-center rounded-lg border border-[#227DE8]/40 py-1.5 text-xs font-medium text-[#227DE8]"
          >
            Ver detalle completo
          </button>
        </DodaMobileActions>
      ) : null}
    </DodaMobileCard>
  );
}
