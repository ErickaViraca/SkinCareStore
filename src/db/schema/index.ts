/**
 * Esquema completo de la base de datos (docs/ESPECIFICACION.md §3).
 * Es la fuente de verdad de las tablas: las migraciones se generan desde aquí
 * con `npm run db:generate`. Las vistas, los permisos y los datos iniciales
 * están en migraciones SQL propias (src/db/migrations).
 */
export * from "./enums";
export * from "./settings";
export * from "./catalog";
export * from "./money";
export * from "./inventory";
export * from "./sales";
export * from "./capital";
export * from "./movements";
export * from "./views";
