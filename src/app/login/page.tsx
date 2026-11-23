import { Suspense } from "react";

import { LoginCard } from "@/components/auth/login-card";
import { EnvironmentBanner } from "@/components/layout/environment-banner";
import { BrandThemeProvider } from "@/components/theme/brand-theme-provider";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { DEFAULT_PALETTE } from "@/lib/branding";
import { loginErrorMessage } from "@/lib/login-errors";
import { signInWithGoogle } from "@/server/controllers/auth.actions";
import { loadEnvironmentLabel } from "@/server/controllers/environment.controller";
import { loadBranding } from "@/server/controllers/session.controller";

export const metadata = { title: "Ingresar · Soleil" };

/** Pantalla de ingreso con Google (§4.16). */
export default function LoginPage({ searchParams }: Readonly<PageProps<"/login">>): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <BrandThemeProvider palette={DEFAULT_PALETTE}>
          <FullPageLoader />
        </BrandThemeProvider>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  readonly searchParams: PageProps<"/login">["searchParams"];
}): Promise<React.JSX.Element> {
  const [{ error }, branding] = await Promise.all([searchParams, loadBranding()]);
  return (
    <BrandThemeProvider palette={branding.palette}>
      <EnvironmentBanner label={loadEnvironmentLabel()} />
      <LoginCard
        storeName={branding.storeName}
        logoUrl={branding.logoUrl}
        errorMessage={loginErrorMessage(error)}
        signInAction={signInWithGoogle}
      />
    </BrandThemeProvider>
  );
}
