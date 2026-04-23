import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

function createDb() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(connectionString, {
    max: 1,
    ssl: "require",
  });
  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
