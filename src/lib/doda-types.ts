export type DodaLookupStatus =
  | "pendiente"
  | "consultando"
  | "verificado"
  | "revision_manual";

export type SatDodaDetails = Record<string, string>;

export type PedimentoInfo = {
  tipoPedimento: string | null;
  pedimento: string | null;
  remesasPresentadas: string | null;
  clavePedimento: string | null;
  datosVehiculo: string | null;
  cantidadMercancia: string | null;
};

export type SatDodaLookupResult = {
  ok: true;
  validatorUrl: string;
  numeroIntegracion: string | null;
  satStatus: string;
  details: SatDodaDetails;
  pedimentoInfo: PedimentoInfo;
};

export type SatDodaLookupFailure = {
  ok: false;
  reason: string;
  validatorUrl?: string;
  debugHtmlPath?: string;
  debugScreenshotPath?: string;
};

export type SatDodaLookupOutcome = SatDodaLookupResult | SatDodaLookupFailure;

export type DodaRecord = {
  id: string;
  cliente_id: string | null;
  pedimento_id: string | null;
  numero_integracion: string | null;
  archivo_url: string | null;
  qr_validator_url: string | null;
  sat_status: string | null;
  sat_details: string | null;
  tipo_pedimento: string | null;
  pedimento: string | null;
  remesas_presentadas: string | null;
  clave_pedimento: string | null;
  datos_vehiculo: string | null;
  cantidad_mercancia: string | null;
  lookup_status: DodaLookupStatus;
  lookup_error: string | null;
  looked_up_at: string | null;
  last_checked_at: string | null;
  check_count: number;
  is_monitored: boolean;
  is_resolved: boolean;
  notification_sent_at: string | null;
  notification_error: string | null;
  whatsapp_phone: string | null;
  source: string | null;
  notas: string | null;
  created_by: string | null;
  created_at: string | null;
};

export const DODA_RECORD_SELECT =
  "id, cliente_id, pedimento_id, numero_integracion, archivo_url, qr_validator_url, sat_status, sat_details, tipo_pedimento, pedimento, remesas_presentadas, clave_pedimento, datos_vehiculo, cantidad_mercancia, lookup_status, lookup_error, looked_up_at, last_checked_at, check_count, is_monitored, is_resolved, notification_sent_at, notification_error, whatsapp_phone, source, notas, created_by, created_at";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  related_id: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
};

export const NOTIFICATION_SELECT =
  "id, user_id, type, related_id, message, is_read, created_at";

export function dodaNotificationHref(dodaId: string): string {
  return `/dashboard/dodas?highlight=${encodeURIComponent(dodaId)}`;
}

export const DODA_LOOKUP_STATUS_LABELS: Record<DodaLookupStatus, string> = {
  pendiente: "Pendiente",
  consultando: "Consultando estado…",
  verificado: "Verificado",
  revision_manual: "Revisión manual",
};
