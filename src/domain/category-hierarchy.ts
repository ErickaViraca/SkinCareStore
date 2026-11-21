/**
 * Reglas de categorías y subcategorías (un solo nivel, decisión de la etapa 3b):
 * "Rostro → Serums" está permitido; "Rostro → Serums → Vitamina C", no.
 */

/** Datos mínimos de la categoría elegida como padre. */
export interface ParentCandidate {
  readonly id: string;
  readonly parentId: string | null;
  readonly archived: boolean;
}

/**
 * Por qué no se puede usar esa categoría padre.
 * Patrón: **Result / unión discriminada**: el servicio elige el mensaje.
 */
export type ParentProblem =
  | "self" // la categoría no puede estar dentro de sí misma
  | "parent-archived" // el padre está archivado
  | "parent-is-subcategory" // el padre ya es una subcategoría (serían dos niveles)
  | "has-subcategories"; // la categoría ya tiene subcategorías (serían dos niveles)

/**
 * Revisa si `parent` puede ser el padre de la categoría `categoryId`
 * (`null` cuando la categoría todavía no existe). `hasSubcategories` indica si
 * la categoría ya tiene subcategorías propias. Devuelve `null` si está permitido.
 */
export function findParentProblem(
  categoryId: string | null,
  parent: ParentCandidate,
  hasSubcategories: boolean,
): ParentProblem | null {
  if (parent.id === categoryId) return "self";
  if (parent.archived) return "parent-archived";
  if (parent.parentId !== null) return "parent-is-subcategory";
  if (hasSubcategories) return "has-subcategories";
  return null;
}
