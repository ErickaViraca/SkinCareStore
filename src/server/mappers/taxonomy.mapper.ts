import "server-only";

import { type BrandDto, type CategoryDto } from "@/server/dto/taxonomy.dto";
import { type BrandListRow } from "@/server/repositories/brands.repository";
import { type CategoryListRow } from "@/server/repositories/categories.repository";

/** Fila de la base → DTO de la lista (solo lo que la pantalla muestra). Patrón: **Mapper**. */

export function toBrandDto(row: BrandListRow): BrandDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    archived: row.archivedAt !== null,
    productCount: row.productCount,
  };
}

export function toCategoryDto(row: CategoryListRow): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    parentName: row.parentName,
    archived: row.archivedAt !== null,
    productCount: row.productCount,
  };
}
