import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import { archiveBrand, createBrand, listBrands, renameBrand, restoreBrand } from "@/server/services/brands.service";

import { createProduct } from "../../helpers/fixtures";
import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

describe("servicio de marcas", () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });

  afterAll(async () => {
    await t.close();
  });

  it("crea una marca con su slug", async () => {
    const brand = await createBrand({ name: "La Roche-Posay" }, t.db);
    expect(brand).toMatchObject({ name: "La Roche-Posay", slug: "la-roche-posay", archivedAt: null });
  });

  it("rechaza un nombre repetido, aunque cambien mayúsculas o tildes", async () => {
    await createBrand({ name: "Cerave" }, t.db);
    await expect(createBrand({ name: "Cerave" }, t.db)).rejects.toBeInstanceOf(ConflictError);
    await expect(createBrand({ name: "CERAVÉ" }, t.db)).rejects.toBeInstanceOf(ConflictError);
  });

  it("rechaza un nombre sin letras ni números", async () => {
    await expect(createBrand({ name: "---" }, t.db)).rejects.toBeInstanceOf(ValidationError);
  });

  it("renombra y actualiza el slug", async () => {
    const brand = await createBrand({ name: "Bioderma Vieja" }, t.db);
    const renamed = await renameBrand(brand.id, { name: "Bioderma" }, t.db);
    expect(renamed).toMatchObject({ id: brand.id, name: "Bioderma", slug: "bioderma" });
  });

  it("no puede renombrar con el nombre de otra marca", async () => {
    await createBrand({ name: "Isdin" }, t.db);
    const other = await createBrand({ name: "Eucerin" }, t.db);
    await expect(renameBrand(other.id, { name: "ISDIN" }, t.db)).rejects.toBeInstanceOf(ConflictError);
  });

  it("archiva y reactiva; la página pública solo ve las activas", async () => {
    const brand = await createBrand({ name: "Neutrogena" }, t.db);

    const archived = await archiveBrand(brand.id, t.db);
    expect(archived.archivedAt).toBeInstanceOf(Date);
    const hidden = await t.client.query("SELECT 1 FROM public_brands WHERE slug = 'neutrogena'");
    expect(hidden.rows).toHaveLength(0);

    const restored = await restoreBrand(brand.id, t.db);
    expect(restored.archivedAt).toBeNull();
    const visible = await t.client.query("SELECT 1 FROM public_brands WHERE slug = 'neutrogena'");
    expect(visible.rows).toHaveLength(1);
  });

  it("archivar una marca conserva sus productos", async () => {
    const brand = await createBrand({ name: "Avène" }, t.db);
    const productId = await createProduct(t.client, { brandId: brand.id });

    await archiveBrand(brand.id, t.db);

    const { rows } = await t.client.query<{ brand_id: string }>("SELECT brand_id FROM products WHERE id = $1", [
      productId,
    ]);
    expect(rows[0]?.brand_id).toBe(brand.id);
  });

  it("lista por nombre con la cantidad de productos", async () => {
    const brand = await createBrand({ name: "Aaa Primera" }, t.db);
    await createProduct(t.client, { brandId: brand.id });
    await createProduct(t.client, { brandId: brand.id });

    const brands = await listBrands(t.db);
    const names = brands.map((row) => row.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(brands.find((row) => row.id === brand.id)?.productCount).toBe(2);
    expect(brands.find((row) => row.name === "Isdin")?.productCount).toBe(0);
  });

  it("avisa si la marca no existe", async () => {
    await expect(renameBrand(MISSING_ID, { name: "X" }, t.db)).rejects.toBeInstanceOf(NotFoundError);
    await expect(archiveBrand(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
    await expect(restoreBrand(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
  });
});
