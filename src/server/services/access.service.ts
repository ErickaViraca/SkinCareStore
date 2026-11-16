import "server-only";

import { z } from "zod";

import { type Database, getDb } from "@/db/client";
import { ValidationError } from "@/server/errors/app-error";
import { createLogger } from "@/server/logger/logger";
import { findAdminUserByEmail, findAdminUserById, upsertAdminUser } from "@/server/repositories/admin-users.repository";

/**
 * Acceso al panel (docs/ESPECIFICACION.md §4.16): Google verifica la cuenta y
 * este servicio decide si ese email puede entrar.
 */

const logger = createLogger("service:access");

const emailSchema = z.email();

/** Administradora con acceso al panel (lo que se guarda en la sesión). */
export interface AdminIdentity {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

/** Normaliza un email para compararlo: sin espacios y en minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Decide si una cuenta ya verificada por Google puede entrar: el email debe
 * estar verificado por Google y existir **activo** en `admin_users`.
 */
export async function authorizeAdmin(
  email: string | null | undefined,
  emailVerified: boolean,
  db: Database = getDb(),
): Promise<AdminIdentity | null> {
  if (!email || !emailVerified) {
    logger.warn("Ingreso rechazado: email ausente o no verificado por Google");
    return null;
  }
  const admin = await findAdminUserByEmail(db, normalizeEmail(email));
  if (!admin?.active) {
    logger.warn("Ingreso rechazado: la cuenta no tiene acceso al panel", { email: normalizeEmail(email) });
    return null;
  }
  logger.info("Ingreso al panel", { adminId: admin.id });
  return { id: admin.id, email: admin.email, name: admin.name };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confirma en cada pedido que la administradora de la sesión sigue activa.
 * Así, desactivarla en `admin_users` le quita el acceso de inmediato, aunque
 * su sesión todavía no haya vencido.
 */
export async function findActiveAdmin(
  adminId: string | null | undefined,
  db: Database = getDb(),
): Promise<AdminIdentity | null> {
  if (!adminId || !UUID_PATTERN.test(adminId)) return null;
  const admin = await findAdminUserById(db, adminId);
  if (!admin?.active) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

/** Da acceso a una administradora (o la reactiva). Lo usa el comando de primer ingreso. */
export async function grantAdminAccess(email: string, name: string, db: Database = getDb()): Promise<AdminIdentity> {
  const normalized = normalizeEmail(email);
  const cleanName = name.trim();
  if (!emailSchema.safeParse(normalized).success)
    throw new ValidationError("El email no es válido.", { email: "Email inválido." });
  if (cleanName === "") throw new ValidationError("Falta el nombre.", { name: "Obligatorio." });
  const admin = await upsertAdminUser(db, normalized, cleanName);
  logger.info("Acceso otorgado al panel", { adminId: admin.id });
  return { id: admin.id, email: admin.email, name: admin.name };
}
