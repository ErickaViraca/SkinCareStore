import { PGlite } from "@electric-sql/pglite";
import { type PgliteDatabase, drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/db/schema";

export const MIGRATIONS_FOLDER = "src/db/migrations";

export interface TestDatabase {
  /** Cliente PGlite, para consultas SQL directas. */
  readonly client: PGlite;
  /** Cliente Drizzle con el esquema completo. */
  readonly db: PgliteDatabase<typeof schema>;
  /** Cierra la base y libera la memoria. */
  close(): Promise<void>;
}

/**
 * Crea una base Postgres nueva y en memoria (PGlite) con todas las
 * migraciones aplicadas (tablas, vistas, permisos y datos iniciales).
 * Cada llamada devuelve una base independiente: los tests no comparten datos.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { client, db, close: () => client.close() };
}

/** Crea una base PGlite vacía, sin migraciones. */
export async function createEmptyDatabase(): Promise<PGlite> {
  const client = new PGlite();
  await client.waitReady;
  return client;
}
