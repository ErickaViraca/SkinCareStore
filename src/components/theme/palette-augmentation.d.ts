import "@mui/material/styles";

/**
 * Colores propios de la tienda que MUI no trae (docs/UI.md §3):
 * `nav` (menú y títulos) y `accent` (detalles).
 */
declare module "@mui/material/styles" {
  interface Palette {
    nav: Palette["primary"];
    accent: Palette["primary"];
  }
  interface PaletteOptions {
    nav?: PaletteOptions["primary"];
    accent?: PaletteOptions["primary"];
  }
}
