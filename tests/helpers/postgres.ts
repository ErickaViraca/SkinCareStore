import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { MIGRATIONS_FOLDER } from "./pglite";

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

function requireUrl(): string {
  if (!testDatabaseUrl) throw new Error("DATABASE_URL_TEST no está definida.");
  return testDatabaseUrl;
}

/** Pool de conexiones al Postgres de tests. Permite varias conexiones simultáneas. */
export function createTestPool(): Pool {
  return new Pool({ connectionString: requireUrl(), max: 5 });
}

export interface IsolatedDatabase {
  /** Conexiones a la base nueva, con todas las migraciones aplicadas. */
  readonly pool: Pool;
  /** Cierra las conexiones y borra la base. */
  drop(): Promise<void>;
}

/**
 * Crea una base nueva dentro del Postgres de tests y le aplica todas las
 * migraciones. Cada archivo de tests usa su propia base, así no se mezclan datos.
 */
export async function createIsolatedDatabase(): Promise<IsolatedDatabase> {
  const adminPool = createTestPool();
  const name = `soleil_test_${randomUUID().replaceAll("-", "")}`;
  await adminPool.query(`CREATE DATABASE ${name}`);

  const url = new URL(requireUrl());
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString(), max: 5 });
  await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });

  return {
    pool,
    drop: async () => {
      await pool.end();
      await adminPool.query(`DROP DATABASE ${name}`);
      await adminPool.end();
    },
  };
}
