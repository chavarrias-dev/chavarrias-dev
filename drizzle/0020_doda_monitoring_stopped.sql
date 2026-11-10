-- Track why/when automated DODA monitoring stopped (liberated or cancelled).
ALTER TABLE "dodas"
  ADD COLUMN IF NOT EXISTS "monitoring_stopped_reason" text;

ALTER TABLE "dodas"
  ADD COLUMN IF NOT EXISTS "monitoring_stopped_at" timestamp;

COMMENT ON COLUMN "dodas"."monitoring_stopped_reason" IS
  'liberado_sat | cancelado_manual';
