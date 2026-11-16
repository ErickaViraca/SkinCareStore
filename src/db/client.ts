import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { type PgDatabase, type PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "./schema";

/**
 * Conexión a la base de datos.
 *
 * Patrón: **Singleton perezoso**. La conexión se crea la primera vez que se
 * usa (no al importar el módulo), así el build y los tests no necesitan una
 * base real. Es el único lugar del proyecto que lee DATABASE_URL
 * (guía de backend §5.8).
 */

/** Tipo de base que reciben los repositorios: sirve igual para Neon (producción) y PGlite (tests). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Database | undefined;

/** Devuelve la conexión, creándola la primera vez. Falla con un mensaje claro si falta DATABASE_URL. */
export function getDb(): Database {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL (ver docs/CONFIGURACION-SERVICIOS.md).");
  instance = drizzle(new Pool({ connectionString: url }), { schema });
  return instance;
}
