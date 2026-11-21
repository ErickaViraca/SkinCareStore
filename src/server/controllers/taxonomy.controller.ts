import "server-only";

import { type BrandDto, type CategoryDto } from "@/server/dto/taxonomy.dto";
import { toBrandDto, toCategoryDto } from "@/server/mappers/taxonomy.mapper";
import { listBrands } from "@/server/services/brands.service";
import { listCategories } from "@/server/services/categories.service";

import { requireAdmin } from "./session.controller";

/** Lecturas de la pantalla "Marcas y categorías" (las escrituras están en `taxonomy.actions.ts`). */

export async function loadBrands(): Promise<BrandDto[]> {
  await requireAdmin();
  return (await listBrands()).map(toBrandDto);
}

export async function loadCategories(): Promise<CategoryDto[]> {
  await requireAdmin();
  return (await listCategories()).map(toCategoryDto);
}
