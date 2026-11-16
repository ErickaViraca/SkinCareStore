import "server-only";

import { type Database } from "@/db/client";
import { settings } from "@/db/schema";

/** Acceso a la fila única de `settings` (configuración de la tienda). Patrón: **Repositorio / DAO**. */

export interface BrandingRow {
  readonly storeName: string;
  readonly logoUrl: string | null;
  readonly colorBackground: string;
  readonly colorNav: string;
  readonly colorPrimary: string;
  readonly colorSecondary: string;
  readonly colorAccent: string;
  readonly colorDanger: string;
  readonly colorText: string;
}

/** Lee el nombre, el logo y los colores de la tienda. `null` si todavía no existe la configuración. */
export async function findBranding(db: Database): Promise<BrandingRow | null> {
  const rows = await db
    .select({
      storeName: settings.storeName,
      logoUrl: settings.logoUrl,
      colorBackground: settings.colorBackground,
      colorNav: settings.colorNav,
      colorPrimary: settings.colorPrimary,
      colorSecondary: settings.colorSecondary,
      colorAccent: settings.colorAccent,
      colorDanger: settings.colorDanger,
      colorText: settings.colorText,
    })
    .from(settings)
    .limit(1);
  return rows[0] ?? null;
}
