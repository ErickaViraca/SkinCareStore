import { type Theme, createTheme } from "@mui/material/styles";

import { type BrandPalette, ON_COLOR } from "@/lib/branding";

/**
 * Arma el tema de Material UI a partir de la paleta de la tienda
 * (docs/ESPECIFICACION.md §4.17 y docs/UI.md §3–§5).
 *
 * Patrón: **Fábrica**. Es una función pura: la misma paleta da el mismo tema,
 * así se puede probar sin navegador. Los colores de las letras son fijos
 * (regla aprobada): no se calculan según el fondo.
 */

/** Colores sin configuración propia (docs/UI.md §3). */
export const NEUTRALS = {
  surface: "#FFFFFF",
  border: "#E7E1C4",
  textSecondary: "#5E6253",
} as const;

const DISPLAY_FONT = "var(--font-display), Georgia, serif";
const BODY_FONT = "var(--font-body), system-ui, sans-serif";

export function buildTheme(palette: BrandPalette): Theme {
  return createTheme({
    palette: {
      mode: "light",
      background: { default: palette.background, paper: NEUTRALS.surface },
      text: { primary: palette.text, secondary: NEUTRALS.textSecondary },
      primary: { main: palette.primary, contrastText: palette.nav },
      secondary: { main: palette.secondary, contrastText: ON_COLOR.nav },
      error: { main: palette.danger, contrastText: ON_COLOR.danger },
      // Avisos de "guardado": el verde bosque de la paleta en vez del verde de MUI.
      success: { main: palette.secondary, contrastText: ON_COLOR.nav },
      divider: NEUTRALS.border,
      nav: { main: palette.nav, contrastText: ON_COLOR.nav },
      accent: { main: palette.accent, contrastText: ON_COLOR.nav },
    },
    // "Computadora" desde 760 px (docs/UI.md §2).
    breakpoints: { values: { xs: 0, sm: 600, md: 760, lg: 1200, xl: 1536 } },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: BODY_FONT,
      fontSize: 14,
      h1: { fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: "1.5rem", color: palette.nav },
      h2: { fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: "1.1875rem", color: palette.nav },
      button: { textTransform: "none", fontWeight: 700, fontSize: "0.875rem" },
      overline: { fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.6px", color: NEUTRALS.textSecondary },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontFamily: DISPLAY_FONT, fontWeight: 700, color: palette.nav } },
      },
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: {
          root: {
            borderRadius: 14,
            borderColor: NEUTRALS.border,
            boxShadow: "0 1px 2px rgba(14, 45, 6, 0.04)",
          },
        },
      },
      // El amarillo verdoso no se lee bien como borde y etiqueta sobre blanco: los campos usan el verde bosque.
      MuiTextField: { defaultProps: { color: "secondary" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12 },
          notchedOutline: { borderWidth: 1.5, borderColor: NEUTRALS.border },
        },
      },
    },
  });
}
