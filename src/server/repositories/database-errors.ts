import "server-only";

import { AppError, ConflictError, DatabaseError, UnexpectedError } from "@/server/errors/app-error";
import { type Logger } from "@/server/logger/logger";

/**
 * Traducción de errores de la base (guía de backend §5.7): las violaciones
 * conocidas pasan a ser errores del negocio; el resto se registra una vez y
 * se relanza como `DatabaseError`.
 */

/** Código de Postgres para "valor repetido en una columna única". */
const UNIQUE_VIOLATION = "23505";

/** Busca el código de Postgres recorriendo la cadena de causas (Drizzle envuelve el error del driver). */
function postgresCode(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

interface TranslateOptions {
  readonly logger: Logger;
  readonly table: string;
  readonly operation: string;
  /** Mensaje para la usuaria si se repite un valor único (por ejemplo, el nombre). */
  readonly conflictMessage: string;
}

/** Ejecuta una consulta y traduce sus errores. */
export async function withDatabaseErrors<T>(options: TranslateOptions, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (postgresCode(error) === UNIQUE_VIOLATION) {
      throw new ConflictError(options.conflictMessage, { cause: error, context: { table: options.table } });
    }
    options.logger.error("Falla de la base de datos", {
      table: options.table,
      operation: options.operation,
      code: postgresCode(error),
      error,
    });
    const databaseError = new DatabaseError({ cause: error, context: { table: options.table } });
    databaseError.logged = true;
    throw databaseError;
  }
}

/** Primera fila de un `INSERT … RETURNING`; si la base no devuelve nada, es un error inesperado. */
export function firstOrThrow<T>(rows: readonly T[], table: string): T {
  const row = rows[0];
  if (row === undefined) throw new UnexpectedError({ context: { table, reason: "RETURNING sin filas" } });
  return row;
}
