DO $$ BEGIN
  CREATE TYPE "public"."doda_lookup_status" AS ENUM(
    'pendiente',
    'consultando',
    'verificado',
    'revision_manual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dodas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid,
	"pedimento_id" uuid,
	"numero_integracion" text,
	"archivo_url" text,
	"qr_validator_url" text,
	"sat_status" text,
	"sat_details" text,
	"lookup_status" "doda_lookup_status" DEFAULT 'pendiente' NOT NULL,
	"lookup_error" text,
	"looked_up_at" timestamp,
	"created_by" uuid,
	"notas" text,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "dodas"
    ADD CONSTRAINT "dodas_cliente_id_clients_id_fk"
    FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "dodas"
    ADD CONSTRAINT "dodas_pedimento_id_pedimentos_id_fk"
    FOREIGN KEY ("pedimento_id") REFERENCES "public"."pedimentos"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "dodas"
    ADD CONSTRAINT "dodas_created_by_profiles_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
