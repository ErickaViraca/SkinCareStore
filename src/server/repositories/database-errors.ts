import "server-only";

import { AppError, ConflictError, DatabaseError, UnexpectedError, ValidationError } from "@/server/errors/app-error";
import { type Logger } from "@/server/logger/logger";

/**
 * Traducción de errores de la base (guía de backend §5.7): las violaciones
 * conocidas pasan a ser errores del negocio; el resto se registra una vez y
 * se relanza como `DatabaseError`.
 */

/** Código de Postgres para "valor repetido en una columna única". */
const UNIQUE_VIOLATION = "23505";
/** Código de Postgres para "no cumple una regla CHECK" (también lo usan nuestros triggers). */
const CHECK_VIOLATION = "23514";

/** El error del driver de Postgres, buscado en la cadena de causas (Drizzle lo envuelve). */
function driverError(error: unknown): { code: string; constraint: string | null } | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    if ("code" in current && typeof current.code === "string") {
      const constraint = "constraint" in current && typeof current.constraint === "string" ? current.constraint : null;
      return { code: current.code, constraint };
    }
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

/** Mensaje para la usuaria cuando la base rechaza un dato por una regla con nombre. */
interface CheckViolationMessage {
  readonly field: string;
  readonly message: string;
}

interface TranslateOptions {
  readonly logger: Logger;
  readonly table: string;
  readonly operation: string;
  /** Mensaje para la usuaria si se repite un valor único (por ejemplo, el nombre). */
  readonly conflictMessage: string;
  /** Reglas CHECK conocidas (por nombre) → campo y mensaje para el formulario. */
  readonly checkViolations?: Readonly<Record<string, CheckViolationMessage>>;
}

/** Ejecuta una consulta y traduce sus errores. */
export async function withDatabaseErrors<T>(options: TranslateOptions, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const driver = driverError(error);
    if (driver?.code === UNIQUE_VIOLATION) {
      throw new ConflictError(options.conflictMessage, { cause: error, context: { table: options.table } });
    }
    const known =
      driver?.code === CHECK_VIOLATION && driver.constraint ? options.checkViolations?.[driver.constraint] : undefined;
    if (known) {
      throw new ValidationError(known.message, { [known.field]: known.message }, { cause: error });
    }
    options.logger.error("Falla de la base de datos", {
      table: options.table,
      operation: options.operation,
      code: driver?.code ?? null,
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
