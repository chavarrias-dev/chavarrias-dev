import "dotenv/config";
import postgres from "postgres";

function parseDbUrl(url) {
  if (!url) {
    return { set: false };
  }
  try {
    const parsed = new URL(url);
    return {
      set: true,
      protocol: parsed.protocol,
      username: parsed.username,
      host: parsed.host,
      pathname: parsed.pathname,
      search: parsed.search || null,
      redacted: `${parsed.protocol}//${parsed.username ? `${parsed.username}:***@` : ""}${parsed.host}${parsed.pathname}${parsed.search ?? ""}`,
    };
  } catch {
    return { set: true, invalid: true, rawLength: url.length };
  }
}

function supabaseProjectRef(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? host;
  } catch {
    return null;
  }
}

function postgresProjectHint(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const user = decodeURIComponent(parsed.username);
    if (user.startsWith("postgres.")) {
      return user.slice("postgres.".length);
    }
    return parsed.hostname;
  } catch {
    return null;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  console.log("=== drizzle.config.ts ===");
  console.log("Uses: process.env.DATABASE_URL");
  console.log("Parsed:", parseDbUrl(databaseUrl));

  console.log("\n=== src/db/index.ts (Drizzle runtime) ===");
  console.log("Uses: process.env.DATABASE_URL");
  console.log("Parsed:", parseDbUrl(databaseUrl));

  console.log("\n=== Supabase client (DODA queries use this) ===");
  console.log("Uses: process.env.NEXT_PUBLIC_SUPABASE_URL");
  console.log("Value:", supabaseUrl ?? "(not set)");
  console.log("Project ref:", supabaseProjectRef(supabaseUrl));

  console.log("\n=== Same Supabase project? ===");
  const pgHint = postgresProjectHint(databaseUrl);
  const sbRef = supabaseProjectRef(supabaseUrl);
  console.log("DATABASE_URL project hint:", pgHint);
  console.log("SUPABASE_URL project ref:", sbRef);
  if (pgHint && sbRef) {
    console.log(
      "Match:",
      pgHint === sbRef || pgHint.includes(sbRef) || sbRef.includes(pgHint),
    );
  } else {
    console.log("Match: unable to determine (missing env var)");
  }

  if (!databaseUrl) {
    console.error("\nDATABASE_URL is not set — cannot list tables.");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, ssl: "require" });
  try {
    const tables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `;

    console.log("\n=== public schema tables (via DATABASE_URL) ===");
    for (const row of tables) {
      console.log(`- ${row.table_name}`);
    }
    console.log(
      `\ndodas exists:`,
      tables.some((t) => t.table_name === "dodas"),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
