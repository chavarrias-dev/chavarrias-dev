CREATE TABLE IF NOT EXISTS "factura_email_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
	"body_template" text NOT NULL,
	"signature_url" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factura_email_settings" ADD CONSTRAINT "factura_email_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "factura_email_settings" ("id", "body_template", "signature_url")
VALUES (
	'default',
	'Estimado {{nombre}}, le enviamos adjunta su factura {{numero}} con fecha {{fecha}} por un monto de {{monto}}. Cualquier duda estamos a sus órdenes. Chavarrias Servicios Aduanales',
	'https://chsdpusnekhqbzqjlpbb.supabase.co/storage/v1/object/public/crm-documents/FACTURAS_.png'
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "factura_email_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
 CREATE POLICY "factura_email_settings_staff_select"
 ON "factura_email_settings"
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
 CREATE POLICY "factura_email_settings_admin_insert"
 ON "factura_email_settings"
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
--> statement-breakpoint
DO $$ BEGIN
 CREATE POLICY "factura_email_settings_admin_update"
 ON "factura_email_settings"
 FOR UPDATE
 TO authenticated
 USING (
   EXISTS (
     SELECT 1 FROM "profiles"
     WHERE "profiles"."id" = auth.uid()
     AND "profiles"."role" = 'admin'
   )
 )
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
