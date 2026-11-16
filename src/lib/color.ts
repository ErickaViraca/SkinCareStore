/**
 * Utilidades de color: validación de colores hexadecimales y contraste de
 * lectura (fórmula WCAG 2.1). Se usan para la identidad visual configurable
 * (docs/ESPECIFICACION.md §4.17).
 */

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Contraste mínimo recomendado para texto normal (WCAG AA). */
export const MIN_READABLE_CONTRAST = 4.5;

/** ¿Es un color hexadecimal de 6 dígitos ("#0E2D06")? */
export function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/** Luminancia relativa de un color (0 = negro, 1 = blanco). */
export function relativeLuminance(hex: string): number {
  if (!isHexColor(hex)) throw new RangeError(`Color inválido: "${hex}"`);
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Contraste entre dos colores, de 1 (igual) a 21 (negro sobre blanco). */
export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}
