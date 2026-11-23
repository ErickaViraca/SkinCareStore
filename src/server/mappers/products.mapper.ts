import "server-only";

import { parseDbMoney } from "@/domain/money";
import { type ProductDetailDto, type ProductListItemDto, type VariantDto } from "@/server/dto/products.dto";
import { type ProductListRow } from "@/server/repositories/products.repository";
import { type VariantDetailRow } from "@/server/repositories/variants.repository";
import { type ProductDetail } from "@/server/services/products.service";

/** Fila de la base → DTO de pantalla (montos en centavos). Patrón: **Mapper**. */

const toCents = (text: string | null): number | null => (text === null ? null : parseDbMoney(text));

/**
 * El costo promedio viene con 4 decimales ("123.4567"): para mostrarlo se
 * redondea al centavo más cercano (es solo informativo; el precio mínimo ya
 * viene redondeado por la base).
 */
export function averageCostToCents(text: string | null): number | null {
  if (text === null) return null;
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(text.trim());
  if (!match) return null;
  const [, whole = "0", fraction = ""] = match;
  const tenThousandths = Number(whole) * 10_000 + Number(fraction.padEnd(4, "0"));
  return Math.floor((tenThousandths + 50) / 100);
}

export function toProductListItemDto(row: ProductListRow): ProductListItemDto {
  return {
    id: row.id,
    name: row.name,
    brandName: row.brandName,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    published: row.published,
    comingSoon: row.comingSoon,
    archived: row.archivedAt !== null,
    variantCount: row.variantCount,
    priceFromCents: toCents(row.priceFromBs),
    searchText: row.variantSearchText,
  };
}

export function toVariantDto(row: VariantDetailRow): VariantDto {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    shade: row.shade,
    presentation: row.presentation,
    salePriceCents: parseDbMoney(row.salePriceBs),
    minStock: row.minStock,
    marginMode: row.marginMode,
    marginPct: row.marginPct,
    marginFixedCents: toCents(row.marginFixedBs),
    published: row.published,
    archived: row.archivedAt !== null,
    sellable: row.sellable,
    averageCostCents: averageCostToCents(row.averageCostBs),
    minimumPriceCents: toCents(row.minimumPriceBs),
  };
}

export function toProductDetailDto({ product, variants, imageCount }: ProductDetail): ProductDetailDto {
  return {
    id: product.id,
    name: product.name,
    brandId: product.brandId,
    categoryId: product.categoryId,
    description: product.description,
    usageInstructions: product.usageInstructions,
    skinTypes: product.skinTypes,
    published: product.published,
    featured: product.featured,
    comingSoon: product.comingSoon,
    archived: product.archivedAt !== null,
    imageCount,
    variants: variants.map(toVariantDto),
  };
}
