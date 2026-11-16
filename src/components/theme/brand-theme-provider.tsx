"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { type BrandPalette } from "@/lib/branding";

import { buildTheme } from "./build-theme";

interface BrandThemeProviderProps {
  readonly palette: BrandPalette;
  readonly children: React.ReactNode;
}

/**
 * Aplica el tema de la tienda a todo lo que envuelve. Recibe solo la paleta
 * (datos simples): el tema se arma en el navegador porque tiene funciones que
 * no pueden viajar desde el servidor.
 */
export function BrandThemeProvider({ palette, children }: BrandThemeProviderProps): React.JSX.Element {
  return (
    <ThemeProvider theme={buildTheme(palette)}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
