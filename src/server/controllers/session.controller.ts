import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { type Branding } from "@/lib/branding";
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

/** Administradora conectada y activa. Si no hay sesión válida, lleva a /login. */
export const requireAdmin = cache(async (): Promise<AdminIdentity> => {
  const session = await auth();
  const admin = await findActiveAdmin(session?.user?.id);
  if (!admin) redirect("/login");
  return admin;
});

/**
 * Nombre, logo y colores de la tienda. Se leen en cada pedido (`connection`)
 * para que un cambio en Configuración se vea al instante y para que el build
 * no necesite la base de datos.
 */
export const loadBranding = cache(async (): Promise<Branding> => {
  await connection();
  return getBranding();
});
