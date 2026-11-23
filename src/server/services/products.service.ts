import "server-only";

import { type Database, getDb } from "@/db/client";
import { toDbMoney } from "@/domain/money";
import { normalizeSku, numberedSku, suggestSku } from "@/domain/sku";
import { slugify } from "@/domain/slug";
import { type CreateProductInput, type ProductFieldsInput, type VariantFieldsInput } from "@/server/dto/products.dto";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import { createLogger } from "@/server/logger/logger";
import { findBrandById } from "@/server/repositories/brands.repository";
import { findCategoryById } from "@/server/repositories/categories.repository";
import { type ProductImageRow, listProductImages } from "@/server/repositories/product-images.repository";
import {
  type ProductListRow,
  type ProductRow,
  type ProductValues,
  findProductById,
  insertProduct,
  isProductSlugTaken,
  listProductsForPanel,
  setProductArchivedAt,
  updateProduct as updateProductRow,
} from "@/server/repositories/products.repository";
import {
  type VariantDetailRow,
  type VariantRow,
  type VariantValues,
  countActiveVariants,
  findVariantById,
  insertVariant,
  isSkuTaken,
  listVariantsWithStock,
  setVariantArchivedAt,
  updateVariant as updateVariantRow,
} from "@/server/repositories/variants.repository";

/**
 * Casos de uso de productos y variantes (§3.2, etapa 3c).
 * Nada se borra: productos y variantes se archivan.
 */

const logger = createLogger("service:products");

/** Intentos para encontrar un slug o un SKU libre agregando un número. */
const MAX_NUMBERED_ATTEMPTS = 50;

export interface ProductDetail {
  readonly product: ProductRow;
  readonly variants: readonly VariantDetailRow[];
  readonly images: readonly ProductImageRow[];
}

const productNotFound = (): NotFoundError => new NotFoundError("El producto no existe.");
const variantNotFound = (): NotFoundError => new NotFoundError("La variante no existe.");

export function listProducts(db: Database = getDb()): Promise<ProductListRow[]> {
  return listProductsForPanel(db);
}

export async function getProductDetail(id: string, db: Database = getDb()): Promise<ProductDetail> {
  const product = await findProductById(db, id);
  if (!product) throw productNotFound();
  const [variants, images] = await Promise.all([listVariantsWithStock(db, id), listProductImages(db, id)]);
  return { product, variants, images };
}

/** Crea un producto junto con su primera variante (opción A aprobada), todo o nada. */
export async function createProduct(input: CreateProductInput, db: Database = getDb()): Promise<ProductRow> {
  const brandName = await assertUsableBrand(db, input.brandId);
  await assertUsableCategory(db, input.categoryId);
  const product = await db.transaction(async (tx) => {
    const values = await productValues(tx, input, brandName);
    const created = await insertProduct(tx, values);
    await insertVariant(tx, created.id, await variantValues(tx, input.variant, { brandName, productName: input.name }));
    return created;
  });
  logger.info("Producto creado", { productId: product.id });
  return product;
}

export async function updateProduct(
  id: string,
  input: ProductFieldsInput,
  db: Database = getDb(),
): Promise<ProductRow> {
  const current = await findProductById(db, id);
  if (!current) throw productNotFound();
  // Una marca o categoría archivada solo se rechaza si se elige ahora; si ya la tenía, se conserva.
  const brandName =
    input.brandId === current.brandId
      ? await brandNameOf(db, input.brandId)
      : await assertUsableBrand(db, input.brandId);
  if (input.categoryId !== current.categoryId) await assertUsableCategory(db, input.categoryId);
  // El slug (la dirección en la página pública) solo cambia si cambia el nombre o la marca.
  const keepSlug = input.name === current.name && input.brandId === current.brandId;
  const values: ProductValues = keepSlug
    ? { ...withoutSlug(input), slug: current.slug }
    : await productValues(db, input, brandName, id);
  const updated = await updateProductRow(db, id, values);
  if (!updated) throw productNotFound();
  logger.info("Producto actualizado", { productId: id });
  return updated;
}

export async function archiveProduct(id: string, db: Database = getDb()): Promise<ProductRow> {
  const product = await setProductArchivedAt(db, id, new Date());
  if (!product) throw productNotFound();
  logger.info("Producto archivado", { productId: id });
  return product;
}

export async function restoreProduct(id: string, db: Database = getDb()): Promise<ProductRow> {
  const product = await setProductArchivedAt(db, id, null);
  if (!product) throw productNotFound();
  logger.info("Producto reactivado", { productId: id });
  return product;
}

/** Agrega un tono o tamaño a un producto existente. */
export async function addVariant(
  productId: string,
  input: VariantFieldsInput,
  db: Database = getDb(),
): Promise<VariantRow> {
  const product = await findProductById(db, productId);
  if (!product) throw productNotFound();
  if (product.archivedAt) throw new BusinessRuleError("El producto está archivado: reactívalo para agregar variantes.");
  const brandName = await brandNameOf(db, product.brandId);
  const variant = await insertVariant(
    db,
    productId,
    await variantValues(db, input, { brandName, productName: product.name }),
  );
  logger.info("Variante creada", { productId, variantId: variant.id });
  return variant;
}

export async function updateVariant(
  id: string,
  input: VariantFieldsInput,
  db: Database = getDb(),
): Promise<VariantRow> {
  const current = await findVariantById(db, id);
  if (!current) throw variantNotFound();
  const product = await findProductById(db, current.productId);
  if (!product) throw productNotFound();
  const brandName = await brandNameOf(db, product.brandId);
  const values = await variantValues(db, input, { brandName, productName: product.name }, id);
  const updated = await updateVariantRow(db, id, values);
  if (!updated) throw variantNotFound();
  logger.info("Variante actualizada", { variantId: id });
  return updated;
}

/** Archiva una variante. La última variante activa no se archiva: se archiva el producto. */
export async function archiveVariant(id: string, db: Database = getDb()): Promise<VariantRow> {
  const current = await findVariantById(db, id);
  if (!current) throw variantNotFound();
  if (!current.archivedAt && (await countActiveVariants(db, current.productId)) <= 1) {
    throw new BusinessRuleError(
      "Es la única variante activa del producto. Para quitarlo de la venta, archiva el producto.",
    );
  }
  const variant = await setVariantArchivedAt(db, id, new Date());
  if (!variant) throw variantNotFound();
  logger.info("Variante archivada", { variantId: id });
  return variant;
}

export async function restoreVariant(id: string, db: Database = getDb()): Promise<VariantRow> {
  const variant = await setVariantArchivedAt(db, id, null);
  if (!variant) throw variantNotFound();
  logger.info("Variante reactivada", { variantId: id });
  return variant;
}

// ---------------------------------------------------------------------------
// Reglas internas
// ---------------------------------------------------------------------------

async function brandNameOf(db: Database, brandId: string): Promise<string> {
  const brand = await findBrandById(db, brandId);
  if (!brand) throw new ValidationError("Revisa la marca.", { brandId: "La marca no existe." });
  return brand.name;
}

/** La marca debe existir y estar activa para elegirla. Devuelve su nombre. */
async function assertUsableBrand(db: Database, brandId: string): Promise<string> {
  const brand = await findBrandById(db, brandId);
  if (!brand) throw new ValidationError("Revisa la marca.", { brandId: "La marca no existe." });
  if (brand.archivedAt) throw new ValidationError("Revisa la marca.", { brandId: "La marca está archivada." });
  return brand.name;
}

async function assertUsableCategory(db: Database, categoryId: string): Promise<void> {
  const category = await findCategoryById(db, categoryId);
  if (!category) throw new ValidationError("Revisa la categoría.", { categoryId: "La categoría no existe." });
  if (category.archivedAt) {
    throw new ValidationError("Revisa la categoría.", { categoryId: "La categoría está archivada." });
  }
}

function withoutSlug(input: ProductFieldsInput): Omit<ProductValues, "slug"> {
  return {
    name: input.name,
    brandId: input.brandId,
    categoryId: input.categoryId,
    description: input.description,
    usageInstructions: input.usageInstructions,
    skinTypes: input.skinTypes,
    published: input.published,
    featured: input.featured,
    comingSoon: input.comingSoon,
  };
}

/** Datos del producto con un slug libre: "marca-producto", y si ya existe, "marca-producto-2". */
async function productValues(
  db: Database,
  input: ProductFieldsInput,
  brandName: string,
  exceptId?: string,
): Promise<ProductValues> {
  const base = slugify(`${brandName} ${input.name}`);
  if (slugify(input.name) === "") {
    throw new ValidationError("Revisa el nombre.", { name: "Usa al menos una letra o un número." });
  }
  for (let attempt = 1; attempt <= MAX_NUMBERED_ATTEMPTS; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    if (!(await isProductSlugTaken(db, slug, exceptId))) return { ...withoutSlug(input), slug };
  }
  throw new BusinessRuleError("Hay demasiados productos con ese nombre. Usa un nombre más específico.");
}

/** Datos de la variante en el formato de la base, con un código (SKU) libre. */
async function variantValues(
  db: Database,
  input: VariantFieldsInput,
  names: { brandName: string; productName: string },
  exceptId?: string,
): Promise<VariantValues> {
  return {
    sku: await resolveSku(db, input, names, exceptId),
    barcode: input.barcode,
    shade: input.shade,
    presentation: input.presentation,
    salePriceBs: toDbMoney(input.salePrice),
    minStock: input.minStock,
    marginMode: input.marginMode,
    marginPct: input.marginMode === "fixed" ? null : input.marginPct,
    marginFixedBs: input.marginFixed === null ? null : toDbMoney(input.marginFixed),
    published: input.published,
  };
}

/**
 * Código escrito a mano: se respeta (es el de fábrica) y debe ser único.
 * Vacío: se sugiere uno y, si ya existe, se numera ("-2", "-3"…).
 */
async function resolveSku(
  db: Database,
  input: VariantFieldsInput,
  names: { brandName: string; productName: string },
  exceptId?: string,
): Promise<string> {
  if (input.sku) {
    const sku = normalizeSku(input.sku);
    if (await isSkuTaken(db, sku, exceptId)) {
      throw new ValidationError("Revisa el código.", { sku: "Ese código (SKU) ya lo usa otra variante." });
    }
    return sku;
  }
  const base = suggestSku({ ...names, shade: input.shade, presentation: input.presentation });
  for (let attempt = 1; attempt <= MAX_NUMBERED_ATTEMPTS; attempt++) {
    const sku = attempt === 1 ? base : numberedSku(base, attempt);
    if (!(await isSkuTaken(db, sku, exceptId))) return sku;
  }
  throw new ValidationError("Revisa el código.", { sku: "Escribe un código: el sugerido ya está en uso." });
}
