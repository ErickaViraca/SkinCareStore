import "server-only";

import { getEnvironmentLabel } from "@/server/config/environment";

/** Texto de la franja "Ambiente de pruebas", o `null` en producción. */
export function loadEnvironmentLabel(): string | null {
  return getEnvironmentLabel();
}
