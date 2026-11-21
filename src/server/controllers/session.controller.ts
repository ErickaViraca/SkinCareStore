import "server-only";

import { type Session } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { type Branding } from "@/lib/branding";
import { UnauthorizedError } from "@/server/errors/app-error";
import { auth } from "@/server/auth/auth";
import { type AdminIdentity, findActiveAdmin } from "@/server/services/access.service";
import { getBranding } from "@/server/services/branding.service";

/**
 * Lecturas que necesita todo el panel: quién está conectada y la identidad
 * visual. Patrón: **Capa de acceso a datos** (Data Access Layer de Next.js):
 * las páginas nunca leen la cookie de sesión por su cuenta.
 *
 * `cache` de React evita repetir la consulta si el layout y la página la piden
 * en el mismo pedido.
 */

/**
 * Lee la sesión en el momento del pedido. `connection()` va primero porque
 * Auth.js usa `crypto` antes de leer la cookie, y con Cache Components Next.js
 * no permite valores aleatorios mientras prepara la parte fija de la página.
 */
async function readSession(): Promise<Session | null> {
  await connection();
  return auth();
}

/** Administradora conectada y activa. Si no hay sesión válida, lleva a /login. */
export const requireAdmin = cache(async (): Promise<AdminIdentity> => {
  const session = await readSession();
  const admin = await findActiveAdmin(session?.user?.id);
  if (!admin) redirect("/login");
  return admin;
});

/**
 * Para las acciones (Server Actions): igual que `requireAdmin`, pero en vez
 * de redirigir lanza `UnauthorizedError`, que `runAction` convierte en una
 * respuesta para la pantalla. Cada acción la llama por su cuenta (guía de
 * backend §3.1): una acción puede invocarse con un POST directo.
 */
export async function requireAdminSession(): Promise<AdminIdentity> {
  const session = await readSession();
  const admin = await findActiveAdmin(session?.user?.id);
  if (!admin) throw new UnauthorizedError();
  return admin;
}

/**
 * Nombre, logo y colores de la tienda. Se leen en cada pedido (`connection`)
 * para que un cambio en Configuración se vea al instante y para que el build
 * no necesite la base de datos.
 */
export const loadBranding = cache(async (): Promise<Branding> => {
  await connection();
  return getBranding();
});
