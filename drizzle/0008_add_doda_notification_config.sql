CREATE TABLE IF NOT EXISTS "doda_notification_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"whatsapp_number" text,
	"whatsapp_group_id" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doda_notification_config" ADD CONSTRAINT "doda_notification_config_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "doda_notification_config" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
 CREATE POLICY "doda_notification_config_staff_select"
 ON "doda_notification_config"
 FOR SELECT
 TO authenticated
 USING (
   EXISTS (
     SELECT 1 FROM "profiles"
     WHERE "profiles"."id" = auth.uid()
     AND "profiles"."role" IN ('admin', 'empleado')
   )
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE POLICY "doda_notification_config_admin_insert"
 ON "doda_notification_config"
 FOR INSERT
 TO authenticated
 WITH CHECK (
   EXISTS (
     SELECT 1 FROM "profiles"
     WHERE "profiles"."id" = auth.uid()
     AND "profiles"."role" = 'admin'
   )
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
