import { MIN_READABLE_CONTRAST, contrastRatio, isHexColor } from "./color";

/**
 * Identidad visual de la tienda (docs/ESPECIFICACION.md §4.17).
 * Los colores vienen de Configuración; los colores de texto encima de cada
 * uno son fijos (regla aprobada): blanco sobre la navegación y el peligro,
 * verde oscuro (el de navegación) sobre el principal, negro sobre el fondo.
 */
export interface BrandPalette {
  readonly background: string;
  readonly nav: string;
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly danger: string;
  readonly text: string;
}

export interface Branding {
  readonly storeName: string;
  readonly logoUrl: string | null;
  readonly palette: BrandPalette;
}

/** Paleta inicial aprobada. También es la que se usa si un color guardado es inválido. */
export const DEFAULT_PALETTE: BrandPalette = {
  background: "#FAF6E3",
  nav: "#0E2D06",
  primary: "#D6D22E",
  secondary: "#4A7A24",
  accent: "#839A2D",
  danger: "#C62828",
  text: "#1C1C1A",
};

export const DEFAULT_BRANDING: Branding = { storeName: "Soleil", logoUrl: null, palette: DEFAULT_PALETTE };

/** Color de texto fijo que va sobre cada color de la paleta. */
export const ON_COLOR = {
  nav: "#FFFFFF",
  danger: "#FFFFFF",
} as const;

/** Reemplaza por el valor inicial cualquier color guardado que no sea un hexadecimal válido. */
export function sanitizePalette(palette: Partial<Record<keyof BrandPalette, string | null>>): BrandPalette {
  const pick = (key: keyof BrandPalette): string => {
    const value = palette[key];
    return value && isHexColor(value) ? value.toUpperCase() : DEFAULT_PALETTE[key];
  };
  return {
    background: pick("background"),
    nav: pick("nav"),
    primary: pick("primary"),
    secondary: pick("secondary"),
    accent: pick("accent"),
    danger: pick("danger"),
    text: pick("text"),
  };
}

/** Una combinación de colores que no se lee bien. */
export interface ContrastWarning {
  readonly pair: string;
  readonly ratio: number;
}

/**
 * Revisa las combinaciones de texto de la paleta y devuelve las que no llegan
 * al contraste recomendado (4,5). Es un aviso: no impide guardar (§4.17).
 */
export function findContrastWarnings(palette: BrandPalette): ContrastWarning[] {
  const pairs: readonly (readonly [string, string, string])[] = [
    ["Texto sobre el fondo", palette.text, palette.background],
    ["Texto sobre las tarjetas", palette.text, "#FFFFFF"],
    ["Letras blancas sobre la navegación", ON_COLOR.nav, palette.nav],
    ["Texto del botón principal", palette.nav, palette.primary],
    ["Títulos sobre el fondo", palette.nav, palette.background],
    ["Letras blancas sobre el color de peligro", ON_COLOR.danger, palette.danger],
  ];
  return pairs
    .map(([pair, foreground, background]) => ({ pair, ratio: contrastRatio(foreground, background) }))
    .filter((check) => check.ratio < MIN_READABLE_CONTRAST);
}
