import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ValidationError } from "@/server/errors/app-error";
import { authorizeAdmin, findActiveAdmin, grantAdminAccess, normalizeEmail } from "@/server/services/access.service";

import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

/** Acceso al panel (§4.16): Google verifica la cuenta y `admin_users` decide si entra. */
describe("servicio de acceso", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  it("normaliza el email quitando espacios y mayúsculas", () => {
    expect(normalizeEmail("  Ana.Perez@Gmail.COM ")).toBe("ana.perez@gmail.com");
  });

  describe("grantAdminAccess", () => {
    it("da acceso guardando el email normalizado", async () => {
      const admin = await grantAdminAccess(" Vanessa@Example.com ", " Vanessa ", t.db);
      expect(admin).toMatchObject({ email: "vanessa@example.com", name: "Vanessa" });
    });

    it("si el email ya existe, actualiza el nombre y la reactiva", async () => {
      const first = await grantAdminAccess("ericka@example.com", "Ericka", t.db);
      await t.client.query("UPDATE admin_users SET active = false WHERE id = $1", [first.id]);

      const again = await grantAdminAccess("ERICKA@example.com", "Ericka V.", t.db);

      expect(again.id).toBe(first.id);
      expect(again.name).toBe("Ericka V.");
      expect(await findActiveAdmin(first.id, t.db)).not.toBeNull();
    });

    it("rechaza un email inválido", async () => {
      await expect(grantAdminAccess("no-es-email", "Ana", t.db)).rejects.toBeInstanceOf(ValidationError);
    });

    it("rechaza un nombre vacío", async () => {
      await expect(grantAdminAccess("ana@example.com", "   ", t.db)).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("authorizeAdmin", () => {
    it("deja entrar a una administradora activa con email verificado", async () => {
      const granted = await grantAdminAccess("activa@example.com", "Activa", t.db);
      await expect(authorizeAdmin("Activa@Example.com", true, t.db)).resolves.toEqual(granted);
    });

    it("rechaza un email que Google no verificó", async () => {
      await grantAdminAccess("sin-verificar@example.com", "Sin verificar", t.db);
      await expect(authorizeAdmin("sin-verificar@example.com", false, t.db)).resolves.toBeNull();
    });

    it("rechaza cuando Google no envía email", async () => {
      await expect(authorizeAdmin(undefined, true, t.db)).resolves.toBeNull();
      await expect(authorizeAdmin(null, true, t.db)).resolves.toBeNull();
    });

    it("rechaza un email que no está en admin_users", async () => {
      await expect(authorizeAdmin("extrana@example.com", true, t.db)).resolves.toBeNull();
    });

    it("rechaza a una administradora desactivada", async () => {
      const admin = await grantAdminAccess("inactiva@example.com", "Inactiva", t.db);
      await t.client.query("UPDATE admin_users SET active = false WHERE id = $1", [admin.id]);
      await expect(authorizeAdmin("inactiva@example.com", true, t.db)).resolves.toBeNull();
    });
  });

  describe("findActiveAdmin", () => {
    it("devuelve la administradora de la sesión si sigue activa", async () => {
      const admin = await grantAdminAccess("sesion@example.com", "Sesión", t.db);
      await expect(findActiveAdmin(admin.id, t.db)).resolves.toEqual(admin);
    });

    it("devuelve null si fue desactivada después de ingresar", async () => {
      const admin = await grantAdminAccess("revocada@example.com", "Revocada", t.db);
      await t.client.query("UPDATE admin_users SET active = false WHERE id = $1", [admin.id]);
      await expect(findActiveAdmin(admin.id, t.db)).resolves.toBeNull();
    });

    it("devuelve null sin id, con un id que no es UUID o con uno inexistente", async () => {
      await expect(findActiveAdmin(undefined, t.db)).resolves.toBeNull();
      await expect(findActiveAdmin("abc", t.db)).resolves.toBeNull();
      await expect(findActiveAdmin("00000000-0000-4000-8000-000000000000", t.db)).resolves.toBeNull();
    });
  });
});
