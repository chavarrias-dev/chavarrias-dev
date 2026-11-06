-- Catálogo de grupos de WhatsApp para notificaciones DODA (sin IDs libres en formularios).
CREATE TABLE IF NOT EXISTS "whatsapp_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "group_id" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "whatsapp_groups_group_id_unique" UNIQUE ("group_id")
);
