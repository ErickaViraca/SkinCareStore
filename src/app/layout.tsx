import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";

import { bodyFont, displayFont } from "@/components/theme/fonts";

export const metadata: Metadata = {
  title: "Soleil · Gestión",
  description: "Panel privado de gestión de Soleil",
  robots: { index: false, follow: false },
};

/**
 * Raíz de la aplicación. No lee datos: así se puede preparar de antemano.
 * El tema (que depende de los colores guardados) se aplica en cada sección,
 * dentro de `<Suspense>`.
 */
export default function RootLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <html lang="es" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
