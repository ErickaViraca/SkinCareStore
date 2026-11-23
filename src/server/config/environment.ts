import "server-only";

/**
 * En qué ambiente corre el panel (producción o pruebas).
 *
 * Vercel define VERCEL_ENV: "production" en el panel oficial y "preview" en
 * el ambiente de pruebas (rama `develop`) y en las vistas previas de los PR.
 * APP_ENVIRONMENT_LABEL permite cambiar el texto de la franja si hiciera falta.
 */
export function getEnvironmentLabel(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const custom = env.APP_ENVIRONMENT_LABEL?.trim();
  if (custom) return custom;
  return env.VERCEL_ENV === "preview" ? "Ambiente de pruebas" : null;
}
