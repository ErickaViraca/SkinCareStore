import { Inter, Playfair_Display } from "next/font/google";

/**
 * Fuentes del panel (docs/UI.md §4). next/font las descarga al compilar y las
 * sirve desde nuestro propio dominio: el navegador no consulta a Google.
 * Cada fuente queda en una variable CSS que usa el tema.
 */
export const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

export const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
