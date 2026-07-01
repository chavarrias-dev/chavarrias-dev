ALTER TABLE "dodas" ADD COLUMN IF NOT EXISTS "notification_sent_at" timestamp;
ALTER TABLE "dodas" ADD COLUMN IF NOT EXISTS "notification_error" text;
