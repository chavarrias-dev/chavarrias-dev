-- Catálogo de grupos de WhatsApp para notificaciones DODA (sin IDs libres en formularios).
CREATE TABLE IF NOT EXISTS "whatsapp_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "group_id" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "whatsapp_groups_group_id_unique" UNIQUE ("group_id")
);

ALTER TABLE "whatsapp_groups" ENABLE ROW LEVEL SECURITY;

-- Lectura para staff autenticado (admin / empleado). Escrituras vía service_role en APIs.
DROP POLICY IF EXISTS "whatsapp_groups_staff_select" ON "whatsapp_groups";
CREATE POLICY "whatsapp_groups_staff_select"
  ON "whatsapp_groups"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'empleado')
    )
  );
