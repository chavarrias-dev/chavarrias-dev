/**
 * Uso: node scripts/delete-user-by-email.mjs "email@ejemplo.com"
 * Requiere .env con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

const emailArg = process.argv[2]?.trim().toLowerCase();
if (!emailArg) {
  console.error("Uso: node scripts/delete-user-by-email.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function purgeProfileReferences(profileId) {
  const steps = [
    () => admin.from("notifications").delete().eq("user_id", profileId),
    () => admin.from("push_subscriptions").delete().eq("user_id", profileId),
    () => admin.from("messages").delete().eq("sender_id", profileId),
    () => admin.from("messages").delete().eq("receiver_id", profileId),
    () => admin.from("activity_logs").delete().eq("user_id", profileId),
    () =>
      admin
        .from("client_documents")
        .update({ subido_por: null })
        .eq("subido_por", profileId),
    () =>
      admin.from("dodas").update({ created_by: null }).eq("created_by", profileId),
    () =>
      admin
        .from("doda_notification_config")
        .update({ created_by: null })
        .eq("created_by", profileId),
  ];

  for (const run of steps) {
    const { error } = await run();
    if (error) throw new Error(error.message);
  }
}

let target = null;

const { data: byEmail, error: findErr } = await admin
  .from("profiles")
  .select("id, email, full_name, role")
  .eq("email", emailArg)
  .maybeSingle();

if (findErr) {
  console.error(findErr.message);
  process.exit(1);
}

target = byEmail;

if (!target) {
  const { data: byName, error: nameErr } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .ilike("full_name", "%arturo%gonz%");

  if (nameErr) {
    console.error(nameErr.message);
    process.exit(1);
  }
  if (byName?.length === 1) {
    target = byName[0];
  }
}

if (!target) {
  console.error(`No se encontró usuario con email ${emailArg}`);
  process.exit(1);
}

console.log(`Eliminando: ${target.full_name ?? target.email} (${target.id})`);

await purgeProfileReferences(target.id);

const { error: profileDelErr } = await admin
  .from("profiles")
  .delete()
  .eq("id", target.id);
if (profileDelErr) {
  console.error("Error al borrar profile:", profileDelErr.message);
  process.exit(1);
}

const { error: authDelErr } = await admin.auth.admin.deleteUser(target.id);
if (authDelErr) {
  console.error("Error al borrar auth:", authDelErr.message);
  process.exit(1);
}

console.log("Usuario eliminado correctamente.");
