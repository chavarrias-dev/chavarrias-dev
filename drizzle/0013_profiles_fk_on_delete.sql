-- Permite borrar perfiles sin violar FK (notificaciones y tablas relacionadas).

ALTER TABLE "notifications"
  DROP CONSTRAINT IF EXISTS "notifications_user_id_profiles_id_fk";

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "push_subscriptions"
  DROP CONSTRAINT IF EXISTS "push_subscriptions_user_id_profiles_id_fk";

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "activity_logs"
  DROP CONSTRAINT IF EXISTS "activity_logs_user_id_profiles_id_fk";

ALTER TABLE "activity_logs"
  ADD CONSTRAINT "activity_logs_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "messages"
  DROP CONSTRAINT IF EXISTS "messages_sender_id_profiles_id_fk";

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_id_profiles_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "messages"
  DROP CONSTRAINT IF EXISTS "messages_receiver_id_profiles_id_fk";

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_receiver_id_profiles_id_fk"
  FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "client_documents"
  DROP CONSTRAINT IF EXISTS "client_documents_subido_por_profiles_id_fk";

ALTER TABLE "client_documents"
  ADD CONSTRAINT "client_documents_subido_por_profiles_id_fk"
  FOREIGN KEY ("subido_por") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "dodas"
  DROP CONSTRAINT IF EXISTS "dodas_created_by_profiles_id_fk";

ALTER TABLE "dodas"
  ADD CONSTRAINT "dodas_created_by_profiles_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "doda_notification_config"
  DROP CONSTRAINT IF EXISTS "doda_notification_config_created_by_profiles_id_fk";

ALTER TABLE "doda_notification_config"
  ADD CONSTRAINT "doda_notification_config_created_by_profiles_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
