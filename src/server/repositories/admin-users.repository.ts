import "server-only";

import { eq } from "drizzle-orm";

import { type Database } from "@/db/client";
import { adminUsers } from "@/db/schema";

/**
 * Acceso a la tabla `admin_users` (administradoras del panel).
 * Patrón: **Repositorio / DAO**: única capa que sabe cómo se guardan.
 */

export interface AdminUserRow {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly active: boolean;
}

const columns = { id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, active: adminUsers.active };

/** Busca una administradora por email (ya normalizado en minúsculas). */
export async function findAdminUserByEmail(db: Database, email: string): Promise<AdminUserRow | null> {
  const rows = await db.select(columns).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  return rows[0] ?? null;
}

/** Busca una administradora por su id. */
export async function findAdminUserById(db: Database, id: string): Promise<AdminUserRow | null> {
  const rows = await db.select(columns).from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Crea una administradora o, si el email ya existe, actualiza su nombre y la reactiva. */
export async function upsertAdminUser(db: Database, email: string, name: string): Promise<AdminUserRow> {
  const rows = await db
    .insert(adminUsers)
    .values({ email, name, active: true })
    .onConflictDoUpdate({ target: adminUsers.email, set: { name, active: true } })
    .returning(columns);
  const row = rows[0];
  if (!row) throw new Error("La base no devolvió la administradora guardada.");
  return row;
}
