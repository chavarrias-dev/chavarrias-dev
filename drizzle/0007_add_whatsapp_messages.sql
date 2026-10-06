CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wa_message_id" text,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"message" text NOT NULL,
	"direction" text NOT NULL,
	"status" text,
	"client_id" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_messages_wa_message_id_unique" UNIQUE("wa_message_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
 CREATE POLICY "whatsapp_messages_staff_select"
 ON "whatsapp_messages"
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
 ALTER PUBLICATION supabase_realtime ADD TABLE "whatsapp_messages";
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN others THEN null;
END $$;
