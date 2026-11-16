import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_BRANDING, DEFAULT_PALETTE } from "@/lib/branding";
import { getBranding } from "@/server/services/branding.service";

import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

/** Identidad visual configurable (§4.17). */
describe("servicio de identidad visual", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  it("con la configuración inicial devuelve la paleta aprobada", async () => {
    const branding = await getBranding(t.db);
    expect(branding.palette).toEqual(DEFAULT_PALETTE);
    expect(branding.logoUrl).toBeNull();
  });

  it("devuelve los colores, el nombre y el logo guardados", async () => {
    await t.client.query(
      "UPDATE settings SET store_name = 'Soleil Skin', logo_url = 'https://img.example.com/logo.png', color_primary = '#aabbcc'",
    );

    const branding = await getBranding(t.db);

    expect(branding).toEqual({
      storeName: "Soleil Skin",
      logoUrl: "https://img.example.com/logo.png",
      palette: { ...DEFAULT_PALETTE, primary: "#AABBCC" },
    });
  });

  it("la base rechaza un color que no es hexadecimal", async () => {
    await expect(t.client.query("UPDATE settings SET color_nav = 'verde'")).rejects.toThrow(/settings_colors_are_hex/);
  });

  it("la vista pública expone el logo y los colores", async () => {
    const { rows } = await t.client.query<{ color_primary: string; logo_url: string | null }>(
      "SELECT color_primary, logo_url FROM public_settings",
    );
    expect(rows[0]?.color_primary).toBe("#aabbcc");
  });

  it("si no hay configuración, usa la identidad inicial", async () => {
    const empty = await createTestDatabase();
    await empty.client.exec("ALTER TABLE settings DISABLE TRIGGER ALL; DELETE FROM settings;");
    await expect(getBranding(empty.db)).resolves.toEqual(DEFAULT_BRANDING);
    await empty.close();
  });

  it("si la base falla, usa la identidad inicial en vez de romper el panel", async () => {
    const broken = await createTestDatabase();
    await broken.close();
    await expect(getBranding(broken.db)).resolves.toEqual(DEFAULT_BRANDING);
  });
});
