/**
 * Tipos de piel de un producto (docs/ESPECIFICACION.md §3.2). Lista fija: en la
 * base se guardan estos códigos; los textos en español están en
 * `src/lib/skin-types.ts`.
 */
export const SKIN_TYPES = [
  "oily",
  "dry",
  "combination",
  "sensitive",
  "acne_prone",
  "hyperpigmentation",
  "mature",
  "all",
] as const;

export type SkinType = (typeof SKIN_TYPES)[number];

const KNOWN = new Set<string>(SKIN_TYPES);

export function isSkinType(value: string): value is SkinType {
  return KNOWN.has(value);
}

/** Quita repetidos y los deja en el orden de la lista (así se guardan siempre igual). */
export function normalizeSkinTypes(values: readonly SkinType[]): SkinType[] {
  const chosen = new Set(values);
  return SKIN_TYPES.filter((type) => chosen.has(type));
}
