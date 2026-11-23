/**
 * Aplica las migraciones pendientes antes de compilar en Vercel
 * (docs/CONFIGURACION-SERVICIOS.md §4).
 *
 * Usa DATABASE_URL_MIGRATIONS: la conexión del dueño de la base (`soleil_owner`),
 * que puede crear tablas. La aplicación, en cambio, usa DATABASE_URL con el
 * usuario limitado `soleil_app`.
 *
 * - Producción (VERCEL_ENV=production): la variable es obligatoria; sin ella
 *   el despliegue se detiene, para no publicar código con la base desactualizada.
 * - Vista previa (preview) o fuera de Vercel: si falta, no migra y sigue.
 *
 * Las migraciones se aplican una sola vez cada una (Drizzle guarda cuáles ya corrieron).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const MIGRATIONS_FOLDER = "src/db/migrations";

async function main(): Promise<number> {
  const url = process.env.DATABASE_URL_MIGRATIONS;
  const environment = process.env.VERCEL_ENV ?? "local";

  if (!url) {
    if (environment === "production") {
      process.stderr.write("Falta DATABASE_URL_MIGRATIONS en producción: no se puede desplegar sin migrar.\n");
      return 1;
    }
    process.stdout.write(`Sin DATABASE_URL_MIGRATIONS (${environment}): no se aplican migraciones.\n`);
    return 0;
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    process.stdout.write(`Migraciones al día (${environment}).\n`);
    return 0;
  } catch (error: unknown) {
    // Solo el mensaje: nunca se imprime la conexión (tiene la contraseña).
    const message = error instanceof Error ? describe(error) : String(error);
    process.stderr.write(`No se pudieron aplicar las migraciones: ${message}\n`);
    return 1;
  } finally {
    await pool.end();
  }
}

/** Mensaje del error y de su causa (Drizzle envuelve el error de Postgres, que es el que explica el problema). */
function describe(error: Error): string {
  return error.cause instanceof Error ? `${error.message.split("\n")[0]} → ${error.cause.message}` : error.message;
}

main().then(
  (code) => process.exit(code),
  () => process.exit(1),
);
