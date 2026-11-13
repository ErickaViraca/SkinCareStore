import { defineConfig } from "drizzle-kit";

/**
 * Configuración de Drizzle Kit (generación y aplicación de migraciones).
 * `db:generate` solo lee el esquema y no necesita base de datos.
 * `db:migrate` aplica las migraciones a la base de DATABASE_URL (desarrollo o producción).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
