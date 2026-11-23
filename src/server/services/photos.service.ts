import "server-only";

import { randomUUID } from "node:crypto";

import { type Database, getDb } from "@/db/client";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import { createLogger } from "@/server/logger/logger";
import {
  type ProductImageRow,
  deleteProductImage,
  findProductImageById,
  imageStats,
  insertProductImage,
  listProductImages,
  setImageSortOrder,
  setImageVariant,
} from "@/server/repositories/product-images.repository";
import { findBrandById } from "@/server/repositories/brands.repository";
import { findProductById } from "@/server/repositories/products.repository";
import { findVariantById } from "@/server/repositories/variants.repository";
import { type PhotoStorage, getPhotoStorage } from "@/server/storage/photo-storage";

/**
 * Fotos de productos (etapa 3d). Flujo de subida:
 * 1. `prepareUpload`: el panel pide un enlace firmado (valida el límite de 10).
 * 2. El navegador sube la foto ya achicada directo a R2.
 * 3. `registerUpload`: se comprueba el archivo en R2 y se guarda en la base.
 */

const logger = createLogger("service:photos");

/** Máximo de fotos por producto (decisión de la etapa 3d). */
const MAX_PHOTOS_PER_PRODUCT = 10;
/** Tamaño máximo de una foto ya achicada (el navegador la deja en ~200–400 KB). */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Tipos aceptados (el navegador convierte a WebP; si no puede, JPEG o PNG). */
const PHOTO_TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as const;
type PhotoType = keyof typeof PHOTO_TYPES;

const KEY_PATTERN = /^products\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(webp|jpg|png)$/;

function requireStorage(storage: PhotoStorage | null): PhotoStorage {
  if (!storage) throw new BusinessRuleError("Las fotos todavía no están configuradas (faltan las variables de R2).");
  return storage;
}

async function requireOpenProduct(db: Database, productId: string): Promise<{ name: string; brandId: string }> {
  const product = await findProductById(db, productId);
  if (!product) throw new NotFoundError("El producto no existe.");
  if (product.archivedAt) throw new BusinessRuleError("El producto está archivado: reactívalo para cambiar sus fotos.");
  return product;
}

async function assertRoomForPhoto(db: Database, productId: string): Promise<{ maxOrder: number }> {
  const stats = await imageStats(db, productId);
  if (stats.total >= MAX_PHOTOS_PER_PRODUCT) {
    throw new BusinessRuleError(
      `Un producto puede tener hasta ${MAX_PHOTOS_PER_PRODUCT} fotos. Borra alguna para subir otra.`,
    );
  }
  return stats;
}

/** ¿Están configuradas las variables de R2? Si no, la pantalla lo avisa en vez de fallar. */
export function arePhotosEnabled(storage: PhotoStorage | null = getPhotoStorage()): boolean {
  return storage !== null;
}

/** Paso 1: enlace firmado para subir una foto del producto. */
export async function prepareUpload(
  productId: string,
  contentType: PhotoType,
  db: Database = getDb(),
  storage: PhotoStorage | null = getPhotoStorage(),
): Promise<{ uploadUrl: string; key: string }> {
  const store = requireStorage(storage);
  await requireOpenProduct(db, productId);
  await assertRoomForPhoto(db, productId);
  const key = `products/${productId}/${randomUUID()}.${PHOTO_TYPES[contentType]}`;
  return { uploadUrl: await store.createUploadUrl(key, contentType), key };
}

/** Paso 3: comprueba el archivo subido y lo registra al final de las fotos. */
export async function registerUpload(
  productId: string,
  key: string,
  db: Database = getDb(),
  storage: PhotoStorage | null = getPhotoStorage(),
): Promise<ProductImageRow> {
  const store = requireStorage(storage);
  const match = KEY_PATTERN.exec(key);
  if (match?.[1] !== productId) throw new ValidationError("La foto no corresponde a este producto.");
  const product = await requireOpenProduct(db, productId);
  const stored = await store.describe(key);
  if (!stored) throw new BusinessRuleError("La foto no llegó a guardarse. Intenta subirla de nuevo.");
  if (stored.size > MAX_PHOTO_BYTES || !(stored.contentType && stored.contentType in PHOTO_TYPES)) {
    await store.remove(key);
    throw new ValidationError("La foto es demasiado grande o no es una imagen válida.");
  }
  const { maxOrder } = await assertRoomForPhoto(db, productId);
  const brand = await findBrandById(db, product.brandId);
  const image = await insertProductImage(db, {
    productId,
    variantId: null,
    url: store.publicUrl(key),
    storageKey: key,
    alt: [brand?.name, product.name].filter(Boolean).join(" "),
    sortOrder: maxOrder + 1,
  });
  logger.info("Foto agregada", { productId, imageId: image.id });
  return image;
}

/** Mueve una foto un lugar antes o después (la primera es la principal). */
export async function movePhoto(
  imageId: string,
  direction: "earlier" | "later",
  db: Database = getDb(),
): Promise<void> {
  const image = await findProductImageById(db, imageId);
  if (!image) throw new NotFoundError("La foto no existe.");
  const photos = await listProductImages(db, image.productId);
  const index = photos.findIndex((photo) => photo.id === imageId);
  const neighbor = photos[direction === "earlier" ? index - 1 : index + 1];
  const current = photos[index];
  if (!neighbor || !current) return;
  // Se renumeran todas para dejar un orden limpio (0, 1, 2…) con el cambio aplicado.
  const reordered = [...photos];
  reordered[index] = neighbor;
  reordered[photos.indexOf(neighbor)] = current;
  await db.transaction(async (tx) => {
    for (const [order, photo] of reordered.entries()) {
      if (photo.sortOrder !== order) await setImageSortOrder(tx, photo.id, order);
    }
  });
}

/** Asocia la foto a una variante (un tono) o a todo el producto (`null`). */
export async function assignPhotoVariant(
  imageId: string,
  variantId: string | null,
  db: Database = getDb(),
): Promise<void> {
  const image = await findProductImageById(db, imageId);
  if (!image) throw new NotFoundError("La foto no existe.");
  if (variantId !== null) {
    const variant = await findVariantById(db, variantId);
    if (variant?.productId !== image.productId) {
      throw new ValidationError("Esa variante no es de este producto.", { variantId: "Variante inválida." });
    }
  }
  await setImageVariant(db, imageId, variantId);
}

/**
 * Borra la foto: primero de la base (deja de mostrarse) y después el archivo.
 * Si R2 falla, queda un archivo huérfano (se registra), nunca una foto rota.
 */
export async function deletePhoto(
  imageId: string,
  db: Database = getDb(),
  storage: PhotoStorage | null = getPhotoStorage(),
): Promise<void> {
  const image = await findProductImageById(db, imageId);
  if (!image) throw new NotFoundError("La foto no existe.");
  await deleteProductImage(db, imageId);
  logger.info("Foto borrada", { productId: image.productId, imageId });
  if (!image.storageKey || !storage) return;
  try {
    await storage.remove(image.storageKey);
  } catch (error: unknown) {
    logger.error("No se pudo borrar el archivo de la foto en R2", { key: image.storageKey, error });
  }
}
