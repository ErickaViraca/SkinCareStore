import "server-only";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { authCallbacks } from "./callbacks";

/**
 * Configuración de Auth.js (docs/ESPECIFICACION.md §4.16).
 *
 * 1. Google comprueba la cuenta y entrega el email verificado.
 * 2. `signIn` decide si ese email puede entrar (tabla `admin_users`). Si no,
 *    Auth.js vuelve a /login con `?error=AccessDenied`.
 * 3. La sesión es un JWT cifrado en una cookie; guarda solo el id de la
 *    administradora. Cada pedido vuelve a confirmar que sigue activa
 *    (`findActiveAdmin` en el controlador de sesión).
 *
 * Lee AUTH_SECRET, AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET del entorno.
 */

/** Una sesión dura como máximo 12 horas: un día de trabajo. */
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: authCallbacks,
});
