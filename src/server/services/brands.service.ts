import "server-only";

import { type Database, getDb } from "@/db/client";
import { slugify } from "@/domain/slug";
import { type BrandInput } from "@/server/dto/taxonomy.dto";
import { NotFoundError, ValidationError } from "@/server/errors/app-error";
import { createLogger } from "@/server/logger/logger";
import {
  type BrandListRow,
  type BrandRow,
  insertBrand,
  listBrandsWithProductCount,
  setBrandArchivedAt,
  updateBrandName,
} from "@/server/repositories/brands.repository";

/**
 * Casos de uso de marcas (§3.2 y etapa 3b). Nada se borra: una marca
 * archivada deja de ofrecerse al crear productos y desaparece de la página
 * pública, pero sus productos se conservan.
 */

const logger = createLogger("service:brands");

/** Nombre limpio y su slug. Un nombre sin letras ni números no sirve para la web. */
function nameAndSlug(input: BrandInput): { name: string; slug: string } {
  const slug = slugify(input.name);
  if (slug === "") throw new ValidationError("Revisa el nombre.", { name: "Usa al menos una letra o un número." });
  return { name: input.name, slug };
}

const notFound = (): NotFoundError => new NotFoundError("La marca no existe.");

export function listBrands(db: Database = getDb()): Promise<BrandListRow[]> {
  return listBrandsWithProductCount(db);
}

export async function createBrand(input: BrandInput, db: Database = getDb()): Promise<BrandRow> {
  const brand = await insertBrand(db, nameAndSlug(input));
  logger.info("Marca creada", { brandId: brand.id });
  return brand;
}

export async function renameBrand(id: string, input: BrandInput, db: Database = getDb()): Promise<BrandRow> {
  const brand = await updateBrandName(db, id, nameAndSlug(input));
  if (!brand) throw notFound();
  logger.info("Marca renombrada", { brandId: id });
  return brand;
}

export async function archiveBrand(id: string, db: Database = getDb()): Promise<BrandRow> {
  const brand = await setBrandArchivedAt(db, id, new Date());
  if (!brand) throw notFound();
  logger.info("Marca archivada", { brandId: id });
  return brand;
}

export async function restoreBrand(id: string, db: Database = getDb()): Promise<BrandRow> {
  const brand = await setBrandArchivedAt(db, id, null);
  if (!brand) throw notFound();
  logger.info("Marca reactivada", { brandId: id });
  return brand;
}
