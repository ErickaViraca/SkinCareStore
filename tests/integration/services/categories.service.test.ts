import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import {
  archiveCategory,
  createCategory,
  listCategories,
  restoreCategory,
  updateCategory,
} from "@/server/services/categories.service";

import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

/** Espera un ValidationError con el mensaje indicado en el campo `parentId`. */
async function expectParentError(promise: Promise<unknown>, message: RegExp): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  expect((error as ValidationError).fieldErrors.parentId).toMatch(message);
}

describe("servicio de categorías", () => {
  let t: TestDatabase;
  let counter = 0;
  const name = (base: string): string => `${base} ${++counter}`;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  it("crea una categoría principal y una subcategoría", async () => {
    const rostro = await createCategory({ name: "Rostro", parentId: null }, t.db);
    const serums = await createCategory({ name: "Sérums", parentId: rostro.id }, t.db);

    expect(rostro).toMatchObject({ slug: "rostro", parentId: null });
    expect(serums).toMatchObject({ slug: "serums", parentId: rostro.id });

    const listed = (await listCategories(t.db)).find((row) => row.id === serums.id);
    expect(listed).toMatchObject({ parentName: "Rostro", productCount: 0 });
  });

  it("rechaza un nombre repetido", async () => {
    await createCategory({ name: "Cuerpo", parentId: null }, t.db);
    await expect(createCategory({ name: "cuerpo", parentId: null }, t.db)).rejects.toBeInstanceOf(ConflictError);
  });

  it("rechaza un nombre sin letras ni números", async () => {
    await expect(createCategory({ name: "!!", parentId: null }, t.db)).rejects.toBeInstanceOf(ValidationError);
  });

  describe("un solo nivel de subcategorías", () => {
    it("no permite crear dentro de una subcategoría", async () => {
      const parent = await createCategory({ name: name("Padre"), parentId: null }, t.db);
      const child = await createCategory({ name: name("Hija"), parentId: parent.id }, t.db);
      await expectParentError(createCategory({ name: name("Nieta"), parentId: child.id }, t.db), /principal/);
    });

    it("no permite mover dentro de otra a una categoría con subcategorías", async () => {
      const parent = await createCategory({ name: name("Con hijas"), parentId: null }, t.db);
      await createCategory({ name: name("Hija"), parentId: parent.id }, t.db);
      const other = await createCategory({ name: name("Otra"), parentId: null }, t.db);

      await expectParentError(
        updateCategory(parent.id, { name: parent.name, parentId: other.id }, t.db),
        /subcategorías/,
      );
    });

    it("no permite que una categoría sea su propio padre", async () => {
      const category = await createCategory({ name: name("Sola"), parentId: null }, t.db);
      await expectParentError(
        updateCategory(category.id, { name: category.name, parentId: category.id }, t.db),
        /sí misma/,
      );
    });

    it("no permite un padre archivado ni uno inexistente", async () => {
      const archived = await createCategory({ name: name("Archivada"), parentId: null }, t.db);
      await archiveCategory(archived.id, t.db);

      await expectParentError(createCategory({ name: name("Nueva"), parentId: archived.id }, t.db), /archivada/);
      await expectParentError(createCategory({ name: name("Nueva"), parentId: MISSING_ID }, t.db), /no existe/);
    });
  });

  it("edita el nombre y mueve una subcategoría a principal", async () => {
    const parent = await createCategory({ name: name("Padre"), parentId: null }, t.db);
    const child = await createCategory({ name: "Contorno de ojos", parentId: parent.id }, t.db);

    const updated = await updateCategory(child.id, { name: "Ojos", parentId: null }, t.db);

    expect(updated).toMatchObject({ name: "Ojos", slug: "ojos", parentId: null });
  });

  it("editar el nombre no revisa de nuevo el padre actual", async () => {
    const parent = await createCategory({ name: name("Padre"), parentId: null }, t.db);
    const child = await createCategory({ name: name("Hija"), parentId: parent.id }, t.db);
    await archiveCategory(child.id, t.db);
    await archiveCategory(parent.id, t.db);

    const renamed = await updateCategory(child.id, { name: name("Renombrada"), parentId: parent.id }, t.db);
    expect(renamed.parentId).toBe(parent.id);
  });

  describe("archivar y reactivar", () => {
    it("no archiva una categoría con subcategorías activas", async () => {
      const parent = await createCategory({ name: name("Padre"), parentId: null }, t.db);
      const child = await createCategory({ name: name("Hija"), parentId: parent.id }, t.db);

      await expect(archiveCategory(parent.id, t.db)).rejects.toBeInstanceOf(BusinessRuleError);

      await archiveCategory(child.id, t.db);
      await expect(archiveCategory(parent.id, t.db)).resolves.toMatchObject({ id: parent.id });
    });

    it("no reactiva una subcategoría si su padre está archivado", async () => {
      const parent = await createCategory({ name: name("Padre"), parentId: null }, t.db);
      const child = await createCategory({ name: name("Hija"), parentId: parent.id }, t.db);
      await archiveCategory(child.id, t.db);
      await archiveCategory(parent.id, t.db);

      await expect(restoreCategory(child.id, t.db)).rejects.toBeInstanceOf(BusinessRuleError);

      await restoreCategory(parent.id, t.db);
      await expect(restoreCategory(child.id, t.db)).resolves.toMatchObject({ archivedAt: null });
    });

    it("la página pública solo ve las categorías activas", async () => {
      const category = await createCategory({ name: "Solares", parentId: null }, t.db);
      await archiveCategory(category.id, t.db);

      const { rows } = await t.client.query("SELECT 1 FROM public_categories WHERE slug = 'solares'");
      expect(rows).toHaveLength(0);
    });
  });

  it("avisa si la categoría no existe", async () => {
    await expect(updateCategory(MISSING_ID, { name: "X", parentId: null }, t.db)).rejects.toBeInstanceOf(NotFoundError);
    await expect(archiveCategory(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
    await expect(restoreCategory(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
  });
});
