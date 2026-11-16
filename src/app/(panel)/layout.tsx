import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { BrandThemeProvider } from "@/components/theme/brand-theme-provider";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { DEFAULT_PALETTE } from "@/lib/branding";
import { signOutOfPanel } from "@/server/controllers/auth.actions";
import { loadBranding, requireAdmin } from "@/server/controllers/session.controller";

/**
 * Estructura común de todas las páginas del panel.
 * La sesión y los colores se leen en cada pedido, por eso van dentro de
 * `<Suspense>` (Cache Components). Mientras tanto se muestra la carga con la
 * paleta inicial.
 */
export default function PanelLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <BrandThemeProvider palette={DEFAULT_PALETTE}>
          <FullPageLoader />
        </BrandThemeProvider>
      }
    >
      <PanelFrame>{children}</PanelFrame>
    </Suspense>
  );
}

async function PanelFrame({ children }: { readonly children: React.ReactNode }): Promise<React.JSX.Element> {
  const [admin, branding] = await Promise.all([requireAdmin(), loadBranding()]);
  return (
    <BrandThemeProvider palette={branding.palette}>
      <AppShell
        storeName={branding.storeName}
        logoUrl={branding.logoUrl}
        adminName={admin.name}
        signOutAction={signOutOfPanel}
      >
        {children}
      </AppShell>
    </BrandThemeProvider>
  );
}
