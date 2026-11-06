-- Lectura de catálogo para staff (si 0017 ya se aplicó sin policies).
ALTER TABLE "whatsapp_groups" ENABLE ROW LEVEL SECURITY;

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
