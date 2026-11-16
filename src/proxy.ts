import { type NextRequest, NextResponse } from "next/server";

/**
 * Revisión rápida antes de cada página del panel: si no hay cookie de sesión,
 * lleva a /login sin cargar la página.
 *
 * Es solo un filtro optimista (recomendación de Next.js): no consulta la base.
 * La verificación real (sesión válida y administradora activa) se hace en el
 * servidor en cada página y en cada acción (`requireAdmin`).
 */

/** Nombres de la cookie de sesión de Auth.js (con HTTPS lleva el prefijo `__Secure-`). */
const SESSION_COOKIE_PREFIXES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => SESSION_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix)));
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Todo menos el ingreso, las rutas de Auth.js y los archivos estáticos.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
