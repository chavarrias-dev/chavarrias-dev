ALTER TABLE "dodas" ADD COLUMN IF NOT EXISTS "notify_type" text;
--> statement-breakpoint
ALTER TABLE "dodas" ADD COLUMN IF NOT EXISTS "notify_whatsapp_number" text;
--> statement-breakpoint
ALTER TABLE "dodas" ADD COLUMN IF NOT EXISTS "notify_whatsapp_group_id" text;
--> statement-breakpoint
ALTER TABLE "dodas" DROP COLUMN IF EXISTS "notify_whatsapp";
