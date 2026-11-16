import "server-only";

import { type Database, getDb } from "@/db/client";
import { type Branding, DEFAULT_BRANDING, sanitizePalette } from "@/lib/branding";
import { createLogger } from "@/server/logger/logger";
import { findBranding } from "@/server/repositories/settings.repository";

const logger = createLogger("service:branding");

/**
 * Identidad visual de la tienda para armar el tema (§4.17). Si la
 * configuración no existe o la base falla, devuelve la identidad inicial:
 * el panel nunca debe quedar sin estilos por un problema de configuración.
 */
export async function getBranding(db?: Database): Promise<Branding> {
  try {
    const row = await findBranding(db ?? getDb());
    if (!row) return DEFAULT_BRANDING;
    return {
      storeName: row.storeName,
      logoUrl: row.logoUrl,
      palette: sanitizePalette({
        background: row.colorBackground,
        nav: row.colorNav,
        primary: row.colorPrimary,
        secondary: row.colorSecondary,
        accent: row.colorAccent,
        danger: row.colorDanger,
        text: row.colorText,
      }),
    };
  } catch (error: unknown) {
    logger.error("No se pudo leer la identidad visual; se usa la inicial", { error });
    return DEFAULT_BRANDING;
  }
}
