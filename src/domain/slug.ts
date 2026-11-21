/**
 * Identificadores para direcciones web ("slug"): "La Roche-Posay" → "la-roche-posay".
 * Los usa la página pública en sus URL (docs/ESPECIFICACION.md §3.2).
 */

const DIACRITICS = /[̀-ͯ]/g;
const NON_ALPHANUMERIC_RUN = /[^a-z0-9]+/g;

/**
 * Convierte un nombre en slug: minúsculas, sin tildes, solo letras y números
 * separados por un guion. Devuelve "" si el nombre no tiene letras ni números.
 */
export function slugify(name: string): string {
  const words = name.normalize("NFD").replace(DIACRITICS, "").toLowerCase().replace(NON_ALPHANUMERIC_RUN, " ").trim();
  return words === "" ? "" : words.split(" ").join("-");
}
