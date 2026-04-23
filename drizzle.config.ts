import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';


export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        // Usamos la URL que ya probamos que funciona
        url: process.env.DATABASE_URL!,
        ssl: true,
    },
    // Esto ayuda a que no se quede colgado intentando comparar esquemas complejos
    verbose: true,
    strict: true,
});