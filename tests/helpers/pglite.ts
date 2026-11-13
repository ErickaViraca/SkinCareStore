import { PGlite } from "@electric-sql/pglite";

/**
 * Crea una base Postgres nueva, vacía y en memoria (PGlite) para un test.
 * Cada llamada devuelve una base independiente: los tests no comparten datos.
 * Desde la etapa 1b, esta función también aplicará las migraciones.
 */
export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.waitReady;
  return db;
}
