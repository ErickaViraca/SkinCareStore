import "server-only";

/**
 * Logger estructurado del servidor.
 *
 * Patrón: **fachada (Facade)** sobre la salida estándar. Todo el código usa
 * esta interfaz en lugar de `console`, para que el formato sea uniforme (una
 * línea JSON por evento, fácil de buscar en los logs de Vercel) y para poder
 * cambiar el destino más adelante sin tocar el resto del código.
 *
 * Cada capa crea su propio logger con `createLogger("capa:modulo")`, así cada
 * línea indica de dónde viene.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/** Destino de las líneas de log. Se puede reemplazar en los tests. */
export type LogSink = (level: LogLevel, line: string) => void;

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Claves cuyo valor nunca debe aparecer en un log. */
const SENSITIVE_KEYS = new Set(["password", "token", "secret", "authorization", "cookie"]);

const defaultSink: LogSink = (level, line) => {
  // Único lugar del proyecto donde se permite `console`.
  // eslint-disable-next-line no-console
  (level === "error" || level === "warn" ? console.error : console.log)(line);
};

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL;
  return configured === "debug" || configured === "warn" || configured === "error" ? configured : "info";
}

/** Reemplaza valores sensibles y convierte errores en objetos legibles. */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[profundidad máxima]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause === undefined ? undefined : sanitize(value.cause, depth + 1),
    };
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? "[oculto]" : sanitize(item, depth + 1),
      ]),
    );
  }
  return value;
}

/** Crea un logger para un módulo. `scope` indica la capa y el módulo, por ejemplo "service:ventas". */
export function createLogger(scope: string, sink: LogSink = defaultSink): Logger {
  const write = (level: LogLevel, message: string, context?: LogContext): void => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel()]) return;
    const entry = {
      time: new Date().toISOString(),
      level,
      scope,
      message,
      ...(context ? { context: sanitize(context) } : {}),
    };
    sink(level, JSON.stringify(entry));
  };

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
