import { numeric, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Columnas que se repiten en muchas tablas. Definirlas en un solo lugar
 * garantiza que todas usen el mismo tipo (por ejemplo, el dinero siempre
 * `numeric(12,2)`, nunca decimales de punto flotante).
 */

/** Clave primaria UUID generada por la base. */
export const id = () => uuid("id").primaryKey().defaultRandom();

/** Monto en bolivianos con dos decimales exactos. */
export const money = (name: string) => numeric(name, { precision: 12, scale: 2 });

/** Fecha y hora con zona horaria. */
export const timestampTz = (name: string) => timestamp(name, { withTimezone: true });

/** Fecha de creación, completada por la base. */
export const createdAt = () => timestampTz("created_at").notNull().defaultNow();

/** Fecha de última modificación, completada por la base al crear. */
export const updatedAt = () => timestampTz("updated_at").notNull().defaultNow();
