import { slugify } from "./slug";

/**
 * Código (SKU) sugerido para una variante (etapa 3c): se arma con la marca, el
 * producto y el tono o tamaño. Por ejemplo, La Roche-Posay + "Effaclar Gel" +
 * "200 ml" → "LRP-EFFACLAR-GEL-200ML". Es solo una sugerencia: la usuaria
 * puede reemplazarlo por el código de fábrica.
 */

export interface SkuParts {
  readonly brandName: string;
  readonly productName: string;
  readonly shade?: string | null;
  readonly presentation?: string | null;
}

/** Largo máximo del código, para que se lea bien en una etiqueta. */
export const MAX_SKU_LENGTH = 40;

const words = (text: string | null | undefined): string[] =>
  slugify(text ?? "")
    .split("-")
    .filter((word) => word !== "");

/** Marca: iniciales si tiene varias palabras ("La Roche-Posay" → "LRP"); si es una, sus 3 primeras letras. */
function brandCode(brandName: string): string {
  const parts = words(brandName);
  if (parts.length === 0) return "";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 3);
  return parts.map((word) => word.charAt(0)).join("");
}

/** Producto: hasta 3 palabras, cada una de hasta 8 letras. */
function productCode(productName: string): string {
  return words(productName)
    .slice(0, 3)
    .map((word) => word.slice(0, 8))
    .join("-");
}

/** Tono o tamaño, sin espacios: "200 ml" → "200ML", "Tono 110" → "TONO110". */
function variantCode(text: string | null | undefined): string {
  return words(text).join("");
}

export function suggestSku(parts: SkuParts): string {
  const code = [
    brandCode(parts.brandName),
    productCode(parts.productName),
    variantCode(parts.shade),
    variantCode(parts.presentation),
  ]
    .filter((part) => part !== "")
    .join("-")
    .toUpperCase();
  return trimSku(code === "" ? "SKU" : code);
}

/** Variante numerada de un código ya usado: "LRP-GEL" → "LRP-GEL-2". */
export function numberedSku(base: string, attempt: number): string {
  const suffix = `-${attempt}`;
  return `${trimSku(base.slice(0, MAX_SKU_LENGTH - suffix.length))}${suffix}`;
}

/** Corta al largo máximo sin dejar un guion al final. */
function trimSku(code: string): string {
  let trimmed = code.slice(0, MAX_SKU_LENGTH);
  while (trimmed.endsWith("-")) trimmed = trimmed.slice(0, -1);
  return trimmed;
}

/** Limpia un código escrito a mano: sin espacios a los lados y en mayúsculas (los de fábrica se respetan). */
export function normalizeSku(code: string): string {
  return code.trim().toUpperCase();
}
