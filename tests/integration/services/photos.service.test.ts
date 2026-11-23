import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { cents } from "@/domain/money";
import { type VariantFieldsInput } from "@/server/dto/products.dto";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import { createBrand } from "@/server/services/brands.service";
import { createCategory } from "@/server/services/categories.service";
import {
  arePhotosEnabled,
  assignPhotoVariant,
  deletePhoto,
  movePhoto,
  prepareUpload,
  registerUpload,
} from "@/server/services/photos.service";
import {
  addVariant,
  archiveProduct,
  createProduct,
  getProductDetail,
  listProducts,
} from "@/server/services/products.service";
import { type PhotoStorage } from "@/server/storage/photo-storage";

import { type TestDatabase, createTestDatabase } from "../../helpers/pglite";

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

/** Almacenamiento falso: guarda en memoria lo "subido". */
function fakeStorage(): PhotoStorage & { files: Map<string, { size: number; contentType: string }> } {
  const files = new Map<string, { size: number; contentType: string }>();
  return {
    files,
    createUploadUrl: vi.fn(async (key: string) => `https://r2.example/${key}?firma`),
    describe: vi.fn(async (key: string) => files.get(key) ?? null),
    remove: vi.fn(async (key: string) => {
      files.delete(key);
    }),
    publicUrl: (key: string) => `https://pub.example/${key}`,
  };
}

const variant = (overrides: Partial<VariantFieldsInput> = {}): VariantFieldsInput => ({
  sku: null,
  barcode: null,
  shade: null,
  presentation: null,
  salePrice: cents(10000),
  minStock: null,
  marginMode: null,
  marginPct: null,
  marginFixed: null,
  published: true,
  ...overrides,
});

describe("servicio de fotos", () => {
  let t: TestDatabase;
  let brandId: string;
  let categoryId: string;
  let counter = 0;

  const newProduct = async (): Promise<string> =>
    (
      await createProduct(
        {
          name: `Producto ${++counter}`,
          brandId,
          categoryId,
          description: "",
          usageInstructions: null,
          skinTypes: [],
          published: true,
          featured: false,
          comingSoon: false,
          variant: variant({ shade: "110" }),
        },
        t.db,
      )
    ).id;

  /** Simula los 3 pasos: enlace firmado → subida del navegador → registro. */
  const upload = async (storage: ReturnType<typeof fakeStorage>, productId: string, size = 300_000) => {
    const { key } = await prepareUpload(productId, "image/webp", t.db, storage);
    storage.files.set(key, { size, contentType: "image/webp" });
    return registerUpload(productId, key, t.db, storage);
  };

  beforeAll(async () => {
    t = await createTestDatabase();
    brandId = (await createBrand({ name: "Isdin" }, t.db)).id;
    categoryId = (await createCategory({ name: "Solares", parentId: null }, t.db)).id;
  });

  afterAll(async () => {
    await t.close();
  });

  it("sin configurar R2 avisa en vez de fallar", async () => {
    const productId = await newProduct();
    expect(arePhotosEnabled(null)).toBe(false);
    await expect(prepareUpload(productId, "image/webp", t.db, null)).rejects.toThrow(/no están configuradas/);
  });

  it("sube y registra fotos en orden, con el nombre del producto como texto alternativo", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();

    const first = await upload(storage, productId);
    const second = await upload(storage, productId);

    expect(first.url).toMatch(new RegExp(`^https://pub.example/products/${productId}/[0-9a-f-]{36}\\.webp$`));
    expect(first).toMatchObject({ sortOrder: 0, alt: `Isdin Producto ${counter}`, variantId: null });
    expect(second.sortOrder).toBe(1);
    expect((await getProductDetail(productId, t.db)).images.map((image) => image.id)).toEqual([first.id, second.id]);
    const listed = (await listProducts(t.db)).find((row) => row.id === productId);
    expect(listed?.thumbnailUrl).toBe(first.url);
  });

  it("no deja pasar de 10 fotos", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();
    for (let index = 0; index < 10; index++) await upload(storage, productId);

    await expect(prepareUpload(productId, "image/webp", t.db, storage)).rejects.toThrow(/hasta 10 fotos/);
  });

  it("rechaza registrar un archivo de otro producto, que no se subió o demasiado grande", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();
    const other = await newProduct();
    const { key } = await prepareUpload(productId, "image/webp", t.db, storage);

    await expect(registerUpload(other, key, t.db, storage)).rejects.toBeInstanceOf(ValidationError);
    await expect(registerUpload(productId, "../otra/ruta.webp", t.db, storage)).rejects.toBeInstanceOf(ValidationError);
    await expect(registerUpload(productId, key, t.db, storage)).rejects.toThrow(/no llegó a guardarse/);

    storage.files.set(key, { size: 6 * 1024 * 1024, contentType: "image/webp" });
    await expect(registerUpload(productId, key, t.db, storage)).rejects.toThrow(/demasiado grande/);
    expect(storage.files.has(key)).toBe(false);
  });

  it("no cambia fotos de un producto archivado ni de uno inexistente", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();
    await archiveProduct(productId, t.db);

    await expect(prepareUpload(productId, "image/webp", t.db, storage)).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(prepareUpload(MISSING_ID, "image/webp", t.db, storage)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("mueve fotos antes y después, y la primera pasa a ser la principal", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();
    const [a, b, c] = [
      await upload(storage, productId),
      await upload(storage, productId),
      await upload(storage, productId),
    ];
    const order = async () => (await getProductDetail(productId, t.db)).images.map((image) => image.id);

    await movePhoto(c.id, "earlier", t.db);
    expect(await order()).toEqual([a.id, c.id, b.id]);
    await movePhoto(c.id, "earlier", t.db);
    expect(await order()).toEqual([c.id, a.id, b.id]);
    // En los extremos no hace nada.
    await movePhoto(c.id, "earlier", t.db);
    await movePhoto(b.id, "later", t.db);
    expect(await order()).toEqual([c.id, a.id, b.id]);
    await expect(movePhoto(MISSING_ID, "later", t.db)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("asigna una foto a un tono del mismo producto (o a todo el producto)", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();
    const tone = await addVariant(productId, variant({ shade: "120" }), t.db);
    const otherTone = (await getProductDetail(await newProduct(), t.db)).variants[0];
    const photo = await upload(storage, productId);

    await assignPhotoVariant(photo.id, tone.id, t.db);
    expect((await getProductDetail(productId, t.db)).images[0]?.variantId).toBe(tone.id);
    await assignPhotoVariant(photo.id, null, t.db);
    expect((await getProductDetail(productId, t.db)).images[0]?.variantId).toBeNull();

    await expect(assignPhotoVariant(photo.id, otherTone?.id ?? MISSING_ID, t.db)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(assignPhotoVariant(MISSING_ID, null, t.db)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("borra la foto de la base y su archivo; si R2 falla, igual deja de mostrarse", async () => {
    const storage = fakeStorage();
    const productId = await newProduct();
    const photo = await upload(storage, productId);
    const second = await upload(storage, productId);

    await deletePhoto(photo.id, t.db, storage);
    expect(storage.remove).toHaveBeenCalledWith(photo.storageKey);
    expect((await getProductDetail(productId, t.db)).images.map((image) => image.id)).toEqual([second.id]);

    vi.mocked(storage.remove).mockRejectedValueOnce(new Error("R2 caído"));
    await deletePhoto(second.id, t.db, storage);
    expect((await getProductDetail(productId, t.db)).images).toEqual([]);
    await expect(deletePhoto(MISSING_ID, t.db, storage)).rejects.toBeInstanceOf(NotFoundError);
  });
});
