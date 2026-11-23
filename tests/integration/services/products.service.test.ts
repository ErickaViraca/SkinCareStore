import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Cents, cents } from "@/domain/money";
import { type CreateProductInput, type VariantFieldsInput } from "@/server/dto/products.dto";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import { createBrand, archiveBrand } from "@/server/services/brands.service";
import { archiveCategory, createCategory } from "@/server/services/categories.service";
import {
  addVariant,
  archiveProduct,
  archiveVariant,
  createProduct,
  getProductDetail,
  listProducts,
  restoreProduct,
  restoreVariant,
  updateProduct,
  updateVariant,
} from "@/server/services/products.service";

import { createLotWithStock } from "../../helpers/fixtures";
import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

function variant(overrides: Partial<VariantFieldsInput> = {}): VariantFieldsInput {
  return {
    sku: null,
    barcode: null,
    shade: null,
    presentation: null,
    salePrice: cents(28990) as Cents,
    minStock: null,
    marginMode: null,
    marginPct: null,
    marginFixed: null,
    published: true,
    ...overrides,
  };
}

async function fieldErrorOf(promise: Promise<unknown>): Promise<Readonly<Record<string, string>>> {
  const error: unknown = await promise.then(
    () => null,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).fieldErrors;
}

describe("servicio de productos y variantes", () => {
  let t: TestDatabase;
  let brandId: string;
  let categoryId: string;
  let counter = 0;

  const product = (overrides: Partial<CreateProductInput> = {}): CreateProductInput => ({
    name: `Effaclar Gel ${++counter}`,
    brandId,
    categoryId,
    description: "",
    usageInstructions: null,
    skinTypes: ["oily"],
    published: false,
    featured: false,
    comingSoon: false,
    variant: variant({ presentation: "200 ml" }),
    ...overrides,
  });

  beforeAll(async () => {
    t = await createTestDatabase();
    brandId = (await createBrand({ name: "La Roche-Posay" }, t.db)).id;
    categoryId = (await createCategory({ name: "Rostro", parentId: null }, t.db)).id;
  });

  afterAll(async () => {
    await t.close();
  });

  describe("crear", () => {
    it("crea el producto con su primera variante, slug de marca + nombre y SKU sugerido", async () => {
      const created = await createProduct(product({ name: "Effaclar Gel" }), t.db);
      const detail = await getProductDetail(created.id, t.db);

      expect(created.slug).toBe("la-roche-posay-effaclar-gel");
      expect(detail.variants).toHaveLength(1);
      expect(detail.variants[0]).toMatchObject({
        sku: "LRP-EFFACLAR-GEL-200ML",
        salePriceBs: "289.90",
        sellable: 0,
        averageCostBs: null,
        minimumPriceBs: null,
      });
      expect(detail.images).toEqual([]);
    });

    it("numera el slug y el SKU sugerido si ya existen", async () => {
      const first = await createProduct(product({ name: "Cicaplast" }), t.db);
      const second = await createProduct(product({ name: "Cicaplast" }), t.db);
      const skus = [first.id, second.id].map(async (id) => (await getProductDetail(id, t.db)).variants[0]?.sku);

      expect(second.slug).toBe("la-roche-posay-cicaplast-2");
      expect(await Promise.all(skus)).toEqual(["LRP-CICAPLAS-200ML", "LRP-CICAPLAS-200ML-2"]);
    });

    it("respeta el código de fábrica escrito a mano (en mayúsculas) y no deja repetirlo", async () => {
      const created = await createProduct(product({ variant: variant({ sku: " 3337875597197 " }) }), t.db);
      expect((await getProductDetail(created.id, t.db)).variants[0]?.sku).toBe("3337875597197");

      const errors = await fieldErrorOf(createProduct(product({ variant: variant({ sku: "3337875597197" }) }), t.db));
      expect(errors.sku).toMatch(/ya lo usa/);
    });

    it("si la variante falla, no queda el producto a medias", async () => {
      const name = "Producto que no debe quedar";
      await createProduct(product({ variant: variant({ sku: "REPETIDO-1" }) }), t.db);

      await expect(createProduct(product({ name, variant: variant({ sku: "REPETIDO-1" }) }), t.db)).rejects.toThrow();

      expect((await listProducts(t.db)).some((row) => row.name === name)).toBe(false);
    });

    it("rechaza una marca o categoría archivada o inexistente", async () => {
      const oldBrand = await createBrand({ name: "Marca vieja" }, t.db);
      await archiveBrand(oldBrand.id, t.db);
      const oldCategory = await createCategory({ name: "Categoría vieja", parentId: null }, t.db);
      await archiveCategory(oldCategory.id, t.db);

      expect((await fieldErrorOf(createProduct(product({ brandId: oldBrand.id }), t.db))).brandId).toMatch(/archivada/);
      expect((await fieldErrorOf(createProduct(product({ brandId: MISSING_ID }), t.db))).brandId).toMatch(/no existe/);
      expect((await fieldErrorOf(createProduct(product({ categoryId: oldCategory.id }), t.db))).categoryId).toMatch(
        /archivada/,
      );
    });

    it("guarda los márgenes y montos en el formato de la base", async () => {
      const created = await createProduct(
        product({
          variant: variant({ marginMode: "max", marginPct: "30", marginFixed: cents(2000) as Cents, minStock: 3 }),
        }),
        t.db,
      );
      expect((await getProductDetail(created.id, t.db)).variants[0]).toMatchObject({
        marginMode: "max",
        marginPct: "30.00",
        marginFixedBs: "20.00",
        minStock: 3,
      });
    });
  });

  describe("editar", () => {
    it("conserva el slug si solo cambian datos que no son el nombre ni la marca", async () => {
      const created = await createProduct(product(), t.db);
      const updated = await updateProduct(
        created.id,
        { ...product({ name: created.name }), published: true, comingSoon: true, skinTypes: ["dry"] },
        t.db,
      );
      expect(updated).toMatchObject({ slug: created.slug, published: true, comingSoon: true, skinTypes: ["dry"] });
    });

    it("cambia el slug si cambia el nombre", async () => {
      const created = await createProduct(product(), t.db);
      const updated = await updateProduct(created.id, product({ name: "Nombre Nuevo" }), t.db);
      expect(updated.slug).toBe("la-roche-posay-nombre-nuevo");
    });

    it("mantiene una marca que se archivó después, pero no deja elegir otra archivada", async () => {
      const brand = await createBrand({ name: "Marca que se archiva" }, t.db);
      const created = await createProduct(product({ brandId: brand.id }), t.db);
      await archiveBrand(brand.id, t.db);

      await expect(
        updateProduct(created.id, product({ name: created.name, brandId: brand.id }), t.db),
      ).resolves.toBeTruthy();

      const other = await createProduct(product(), t.db);
      expect((await fieldErrorOf(updateProduct(other.id, product({ brandId: brand.id }), t.db))).brandId).toMatch(
        /archivada/,
      );
    });

    it("el precio no puede quedar debajo del mínimo una vez que hay compras", async () => {
      const created = await createProduct(product(), t.db);
      const variantRow = (await getProductDetail(created.id, t.db)).variants[0];
      if (!variantRow) throw new Error("sin variante");
      await createLotWithStock(t.client, variantRow.id, { quantity: 5, costBs: "200.00" });

      const detail = (await getProductDetail(created.id, t.db)).variants[0];
      expect(detail?.minimumPriceBs).toBe("250.00");
      const errors = await fieldErrorOf(
        updateVariant(variantRow.id, variant({ sku: variantRow.sku, salePrice: cents(20000) as Cents }), t.db),
      );
      expect(errors.salePrice).toMatch(/precio mínimo/);
    });

    it("edita una variante conservando su código", async () => {
      const created = await createProduct(product(), t.db);
      const variantRow = (await getProductDetail(created.id, t.db)).variants[0];
      if (!variantRow) throw new Error("sin variante");

      const updated = await updateVariant(
        variantRow.id,
        variant({ sku: variantRow.sku, shade: "Tono 2", salePrice: cents(30000) as Cents }),
        t.db,
      );
      expect(updated).toMatchObject({ sku: variantRow.sku, shade: "Tono 2", salePriceBs: "300.00" });
    });
  });

  describe("variantes", () => {
    it("agrega tonos a un producto existente", async () => {
      const created = await createProduct(product({ name: "Fit Me", variant: variant({ shade: "110" }) }), t.db);
      await addVariant(created.id, variant({ shade: "120" }), t.db);

      const skus = (await getProductDetail(created.id, t.db)).variants.map((row) => row.sku);
      expect(skus).toEqual(["LRP-FIT-ME-110", "LRP-FIT-ME-120"]);
    });

    it("no agrega variantes a un producto archivado o inexistente", async () => {
      const created = await createProduct(product(), t.db);
      await archiveProduct(created.id, t.db);
      await expect(addVariant(created.id, variant(), t.db)).rejects.toBeInstanceOf(BusinessRuleError);
      await expect(addVariant(MISSING_ID, variant(), t.db)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("no archiva la única variante activa; sí cuando hay otra", async () => {
      const created = await createProduct(product(), t.db);
      const first = (await getProductDetail(created.id, t.db)).variants[0];
      if (!first) throw new Error("sin variante");

      await expect(archiveVariant(first.id, t.db)).rejects.toBeInstanceOf(BusinessRuleError);

      await addVariant(created.id, variant({ shade: "Otro" }), t.db);
      await expect(archiveVariant(first.id, t.db)).resolves.toMatchObject({ id: first.id });
      await expect(restoreVariant(first.id, t.db)).resolves.toMatchObject({ archivedAt: null });
    });
  });

  describe("lista y archivo", () => {
    it("resume variantes activas, precio desde y texto para buscar", async () => {
      const created = await createProduct(
        product({ name: "Lista", variant: variant({ shade: "Nude", salePrice: cents(15000) as Cents }) }),
        t.db,
      );
      await addVariant(created.id, variant({ shade: "Rojo", salePrice: cents(12000) as Cents }), t.db);

      const row = (await listProducts(t.db)).find((item) => item.id === created.id);
      expect(row).toMatchObject({ variantCount: 2, priceFromBs: "120.00", archivedAt: null });
      expect(row?.variantSearchText).toContain("Nude");
      expect(row?.variantSearchText).toContain("Rojo");
    });

    it("archiva y reactiva un producto", async () => {
      const created = await createProduct(product(), t.db);
      expect((await archiveProduct(created.id, t.db)).archivedAt).toBeInstanceOf(Date);
      expect((await restoreProduct(created.id, t.db)).archivedAt).toBeNull();
    });

    it("avisa si el producto o la variante no existen", async () => {
      await expect(getProductDetail(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
      await expect(updateProduct(MISSING_ID, product(), t.db)).rejects.toBeInstanceOf(NotFoundError);
      await expect(archiveProduct(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
      await expect(restoreProduct(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
      await expect(updateVariant(MISSING_ID, variant(), t.db)).rejects.toBeInstanceOf(NotFoundError);
      await expect(archiveVariant(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
      await expect(restoreVariant(MISSING_ID, t.db)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rechaza un nombre sin letras ni números", async () => {
      expect((await fieldErrorOf(createProduct(product({ name: "!!" }), t.db))).name).toMatch(/letra/);
    });
  });
});
