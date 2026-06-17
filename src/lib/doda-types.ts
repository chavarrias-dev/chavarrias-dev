export type DodaLookupStatus =
  | "pendiente"
  | "consultando"
  | "verificado"
  | "revision_manual";

export type SatDodaDetails = Record<string, string>;

export type SatDodaLookupResult = {
  ok: true;
  validatorUrl: string;
  numeroIntegracion: string | null;
  satStatus: string;
  details: SatDodaDetails;
};

export type SatDodaLookupFailure = {
  ok: false;
  reason: string;
  validatorUrl?: string;
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
  lookup_status: DodaLookupStatus;
  lookup_error: string | null;
  looked_up_at: string | null;
  whatsapp_phone: string | null;
  source: string | null;
  notas: string | null;
  created_at: string | null;
};

export const DODA_LOOKUP_STATUS_LABELS: Record<DodaLookupStatus, string> = {
  pendiente: "Pendiente",
  consultando: "Consultando estado…",
  verificado: "Verificado",
  revision_manual: "Revisión manual",
};
