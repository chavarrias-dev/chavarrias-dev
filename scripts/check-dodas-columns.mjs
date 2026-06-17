import "dotenv/config";
import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, ssl: "require" });
  try {
    const columns = await sql`
      select column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dodas'
      order by ordinal_position
    `;

    console.log("=== public.dodas columns ===");
    for (const column of columns) {
      console.log(
        `- ${column.column_name} (${column.data_type}, nullable=${column.is_nullable})`,
      );
    }

    const names = columns.map((c) => c.column_name);
    console.log("\nwhatsapp_phone exists:", names.includes("whatsapp_phone"));
    console.log("source exists:", names.includes("source"));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
