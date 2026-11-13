import "server-only";

import { type AppErrorCode, type FieldErrors, ValidationError, toAppError } from "@/server/errors/app-error";
import { type Logger } from "@/server/logger/logger";

/**
 * Respuesta uniforme de los controladores (Server Actions y Route Handlers)
 * hacia la interfaz.
 *
 * Patrón: **Result / unión discriminada**. Siguiendo la recomendación de
 * Next.js 16, los errores *esperados* (validación, reglas del negocio) no se
 * lanzan hacia la UI: se devuelven como valor, para mostrarlos con
 * `useActionState`. Los servicios sí lanzan `AppError`; este módulo es la
 * frontera que los traduce.
 */
export type ActionResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: AppErrorCode;
        readonly message: string;
        readonly fieldErrors?: FieldErrors;
      };
    };

/** Ejecuta la lógica de un controlador y convierte cualquier error en un `ActionResult`. */
export async function runAction<T>(
  logger: Logger,
  actionName: string,
  operation: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (thrown: unknown) {
    const error = toAppError(thrown);

    if (!error.logged) {
      // Errores esperados → warn; fallas técnicas o inesperadas → error.
      const isExpected = error.code !== "DATABASE" && error.code !== "UNEXPECTED";
      logger[isExpected ? "warn" : "error"](`${actionName} falló`, {
        code: error.code,
        context: error.context,
        error: error.cause ?? error,
      });
      error.logged = true;
    }

    return {
      ok: false,
      error: {
        code: error.code,
        message: error.userMessage,
        ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
      },
    };
  }
}
