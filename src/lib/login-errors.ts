/**
 * Mensajes de la pantalla de ingreso según el código que Auth.js pone en
 * `?error=` al volver de un intento fallido.
 */

const ACCESS_DENIED_MESSAGE = "Esta cuenta no tiene acceso al panel.";
const GENERIC_MESSAGE = "No se pudo ingresar. Intenta de nuevo.";

export function loginErrorMessage(code: string | string[] | undefined): string | null {
  if (code === undefined) return null;
  return code === "AccessDenied" ? ACCESS_DENIED_MESSAGE : GENERIC_MESSAGE;
}
