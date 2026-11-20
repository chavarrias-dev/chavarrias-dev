-- Tracks the last SAT status for which Evolution/WhatsApp was already sent,
-- so RECONOCIMIENTO ADUANERO and DESADUANAMIENTO LIBRE can each notify once.
ALTER TABLE "dodas"
  ADD COLUMN IF NOT EXISTS "last_notified_sat_status" text;

COMMENT ON COLUMN "dodas"."last_notified_sat_status" IS
  'Último sat_status por el que ya se envió aviso WhatsApp (Evolution)';
