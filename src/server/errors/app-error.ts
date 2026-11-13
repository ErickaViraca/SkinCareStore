import "server-only";

/**
 * Jerarquía de errores de la aplicación.
 *
 * Patrón: **jerarquía de excepciones tipadas**. Cada clase representa una
 * categoría de error conocida, con un código estable (para logs y tests) y un
 * mensaje en español apto para mostrar a la usuaria. Las capas lanzan estos
 * errores; el controlador los convierte en una respuesta para la UI
 * (ver `run-action.ts`). Así ninguna capa decide cómo se muestra un error,
 * solo qué pasó.
 */

/** Códigos estables de error. Se usan en logs, tests y en la UI. */
export type AppErrorCode =
  "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "BUSINESS_RULE" | "UNAUTHORIZED" | "FORBIDDEN" | "DATABASE" | "UNEXPECTED";

export interface AppErrorOptions {
  /** Datos técnicos para el log. Nunca se envían a la UI. */
  readonly context?: Readonly<Record<string, unknown>>;
  /** Error original que causó este, para no perder el rastro. */
  readonly cause?: unknown;
}

/** Errores por campo de un formulario: nombre del campo → mensaje. */
export type FieldErrors = Readonly<Record<string, string>>;

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
  /** Mensaje en español que puede ver la usuaria. */
  readonly userMessage: string;
  readonly context: Readonly<Record<string, unknown>>;
  /** Se marca cuando una capa ya lo registró en el log, para no duplicarlo. */
  logged = false;

  protected constructor(userMessage: string, options: AppErrorOptions = {}) {
    super(userMessage, { cause: options.cause });
    this.name = new.target.name;
    this.userMessage = userMessage;
    this.context = options.context ?? {};
  }
}

/** Datos de entrada inválidos (formato, campos faltantes). */
export class ValidationError extends AppError {
  readonly code = "VALIDATION";
  readonly fieldErrors: FieldErrors;

  constructor(userMessage: string, fieldErrors: FieldErrors = {}, options?: AppErrorOptions) {
    super(userMessage, options);
    this.fieldErrors = fieldErrors;
  }
}

/** El recurso pedido no existe (por ejemplo, una variante archivada). */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";

  constructor(userMessage: string, options?: AppErrorOptions) {
    super(userMessage, options);
  }
}

/** Choque con datos existentes (por ejemplo, un SKU repetido). */
export class ConflictError extends AppError {
  readonly code = "CONFLICT";

  constructor(userMessage: string, options?: AppErrorOptions) {
    super(userMessage, options);
  }
}

/** Una regla del negocio impide la operación (por ejemplo, vender sin stock). */
export class BusinessRuleError extends AppError {
  readonly code = "BUSINESS_RULE";

  constructor(userMessage: string, options?: AppErrorOptions) {
    super(userMessage, options);
  }
}

/** No hay sesión iniciada. */
export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";

  constructor(userMessage = "Tu sesión expiró. Vuelve a iniciar sesión.", options?: AppErrorOptions) {
    super(userMessage, options);
  }
}

/** Hay sesión, pero sin permiso para esta acción. */
export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";

  constructor(userMessage = "No tienes permiso para realizar esta acción.", options?: AppErrorOptions) {
    super(userMessage, options);
  }
}

/**
 * Falla técnica de la base de datos. El mensaje para la usuaria es genérico:
 * el detalle técnico va solo al log, dentro de `context` y `cause`.
 */
export class DatabaseError extends AppError {
  readonly code = "DATABASE";

  constructor(options?: AppErrorOptions) {
    super("No se pudo completar la operación. Intenta de nuevo en unos segundos.", options);
  }
}

/** Cualquier error no previsto, envuelto para tratarlo de forma uniforme. */
export class UnexpectedError extends AppError {
  readonly code = "UNEXPECTED";

  constructor(options?: AppErrorOptions) {
    super("Ocurrió un error inesperado. Si se repite, avisa a la administradora.", options);
  }
}

/** Convierte cualquier valor lanzado en un `AppError`, sin perder la causa. */
export function toAppError(error: unknown): AppError {
  return error instanceof AppError ? error : new UnexpectedError({ cause: error });
}
