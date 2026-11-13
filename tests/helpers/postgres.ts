import { Pool } from "pg";

/**
 * Acceso al Postgres real de los tests de concurrencia y permisos.
 *
 * En GitHub Actions la base es un contenedor temporal que se destruye al
 * terminar. Localmente, estos tests se saltan si no se define
 * DATABASE_URL_TEST; en CI la variable es obligatoria (si falta, fallan).
 * Nunca debe apuntar a Neon.
 */
const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl && process.env.CI) {
  throw new Error("DATABASE_URL_TEST es obligatoria en CI para los tests de Postgres.");
}

export const hasTestDatabase = testDatabaseUrl !== undefined;

/** Pool de conexiones al Postgres de tests. Permite varias conexiones simultáneas. */
export function createTestPool(): Pool {
  if (!testDatabaseUrl) throw new Error("DATABASE_URL_TEST no está definida.");
  return new Pool({ connectionString: testDatabaseUrl, max: 5 });
}
