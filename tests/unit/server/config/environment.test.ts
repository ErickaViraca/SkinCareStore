import { describe, expect, it } from "vitest";

import { getEnvironmentLabel } from "@/server/config/environment";

describe("getEnvironmentLabel", () => {
  it("en producción no muestra franja", () => {
    expect(getEnvironmentLabel({ VERCEL_ENV: "production" })).toBeNull();
    expect(getEnvironmentLabel({})).toBeNull();
  });

  it("en el ambiente de pruebas (preview de Vercel) la muestra", () => {
    expect(getEnvironmentLabel({ VERCEL_ENV: "preview" })).toBe("Ambiente de pruebas");
  });

  it("el texto se puede cambiar con APP_ENVIRONMENT_LABEL", () => {
    expect(getEnvironmentLabel({ VERCEL_ENV: "production", APP_ENVIRONMENT_LABEL: " Demo " })).toBe("Demo");
  });
});
