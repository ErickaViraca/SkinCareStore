"use server";

import { signIn, signOut } from "@/server/auth/auth";

/** Acciones del formulario de ingreso y del botón "Salir". */

/** Envía a Google para ingresar; al volver, entra al inicio del panel. */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

/** Cierra la sesión y vuelve a la pantalla de ingreso. */
export async function signOutOfPanel(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
