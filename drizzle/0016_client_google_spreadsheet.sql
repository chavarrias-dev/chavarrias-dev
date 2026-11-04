ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "google_spreadsheet_id" text,
ADD COLUMN IF NOT EXISTS "google_spreadsheet_url" text,
ADD COLUMN IF NOT EXISTS "google_spreadsheet_created_at" timestamp;
