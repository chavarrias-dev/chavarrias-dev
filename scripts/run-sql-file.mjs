/**
 * Usage: node scripts/run-sql-file.mjs drizzle/0014_factura_email_settings.sql
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: resolve(process.cwd(), ".env") });

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Uso: node scripts/run-sql-file.mjs <ruta.sql>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL no está definida en .env");
  process.exit(1);
}

const raw = readFileSync(resolve(process.cwd(), fileArg), "utf8");
const statements = raw
  .split("--> statement-breakpoint")
  .map((chunk) => chunk.replace(/^\s+|\s+$/g, ""))
  .filter(Boolean);

const sql = postgres(databaseUrl, { max: 1 });

try {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }
  console.log(`OK: ${statements.length} sentencias ejecutadas desde ${fileArg}`);
} catch (error) {
  console.error("Error al ejecutar SQL:", error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
