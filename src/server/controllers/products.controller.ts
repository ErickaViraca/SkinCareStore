import "server-only";

import { notFound } from "next/navigation";

import { type OptionDto, type ProductDetailDto, type ProductListItemDto } from "@/server/dto/products.dto";
import { idSchema } from "@/server/dto/taxonomy.dto";
import { NotFoundError } from "@/server/errors/app-error";
import { toProductDetailDto, toProductListItemDto } from "@/server/mappers/products.mapper";
import { listBrands } from "@/server/services/brands.service";
import { listCategories } from "@/server/services/categories.service";
import { arePhotosEnabled } from "@/server/services/photos.service";
import { getProductDetail, listProducts } from "@/server/services/products.service";

import { requireAdmin } from "./session.controller";

/** Lecturas de las pantallas de productos (las escrituras están en `products.actions.ts`). */

export async function loadProducts(): Promise<ProductListItemDto[]> {
  await requireAdmin();
  return (await listProducts()).map(toProductListItemDto);
}

/** Ficha de un producto. Un id inválido o inexistente muestra la página "no encontrado". */
export async function loadProductDetail(id: string): Promise<ProductDetailDto> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) notFound();
  try {
    return toProductDetailDto(await getProductDetail(parsed.data));
  } catch (error: unknown) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

/** Marcas y categorías activas para los selectores del formulario. */
export async function loadProductFormOptions(): Promise<{ brands: OptionDto[]; categories: OptionDto[] }> {
  await requireAdmin();
  const [brands, categories] = await Promise.all([listBrands(), listCategories()]);
  const byLabel = (a: OptionDto, b: OptionDto): number => a.label.localeCompare(b.label, "es");
  return {
    brands: brands
      .filter((brand) => brand.archivedAt === null)
      .map((brand) => ({ id: brand.id, label: brand.name }))
      .sort(byLabel),
    categories: categories
      .filter((category) => category.archivedAt === null)
      .map((category) => ({
        id: category.id,
        label: category.parentName ? `${category.parentName} › ${category.name}` : category.name,
      }))
      .sort(byLabel),
  };
}

/** ¿Se pueden subir fotos? (faltan las variables de R2 → la sección lo avisa). */
export async function loadPhotosEnabled(): Promise<boolean> {
  await requireAdmin();
  return arePhotosEnabled();
}
