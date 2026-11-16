import "server-only";

import { type NextAuthConfig } from "next-auth";

import { authorizeAdmin } from "@/server/services/access.service";

/**
 * Reglas de ingreso de Auth.js (docs/ESPECIFICACION.md §4.16), separadas de
 * la configuración para poder probarlas sin Google ni Next.js.
 */
export const authCallbacks = {
  /** Solo Google, y solo emails verificados que estén activos en `admin_users`. */
  async signIn({ account, profile }) {
    if (account?.provider !== "google") return false;
    const admin = await authorizeAdmin(profile?.email, profile?.email_verified === true);
    return admin !== null;
  },
  /** Al ingresar, guarda en el token el id y el nombre de la administradora. */
  async jwt({ token, profile }) {
    // `profile` solo llega en el momento de ingresar; después el token ya tiene el id.
    if (profile) {
      const admin = await authorizeAdmin(profile.email, profile.email_verified === true);
      if (admin) {
        token.adminId = admin.id;
        token.name = admin.name;
      }
    }
    return token;
  },
  /** La sesión expone solo el id; el resto se vuelve a leer de la base en cada pedido. */
  session({ session, token }) {
    session.user.id = typeof token.adminId === "string" ? token.adminId : "";
    return session;
  },
} satisfies NextAuthConfig["callbacks"];
