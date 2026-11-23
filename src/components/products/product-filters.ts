import { normalizeForSearch } from "@/components/catalog/taxonomy-filter";

/** Filtros de la lista de productos (pastillas de estado + categoría + buscador). */

export type ProductStatusFilter = "all" | "published" | "draft" | "coming_soon" | "archived";

export interface FilterableProduct {
  readonly name: string;
  readonly brandName: string;
  readonly categoryId: string;
  readonly published: boolean;
  readonly comingSoon: boolean;
  readonly archived: boolean;
  readonly searchText: string;
}

function matchesStatus(product: FilterableProduct, status: ProductStatusFilter): boolean {
  switch (status) {
    case "all":
      return !product.archived;
    case "published":
      return !product.archived && product.published;
    case "draft":
      return !product.archived && !product.published;
    case "coming_soon":
      return !product.archived && product.comingSoon;
    case "archived":
      return product.archived;
  }
}

/** Productos que cumplen el estado, la categoría (`null` = todas) y la búsqueda (nombre, marca, código, tono). */
export function filterProducts<T extends FilterableProduct>(
  products: readonly T[],
  filters: { readonly query: string; readonly status: ProductStatusFilter; readonly categoryId: string | null },
): T[] {
  const needle = normalizeForSearch(filters.query);
  return products.filter(
    (product) =>
      matchesStatus(product, filters.status) &&
      (filters.categoryId === null || product.categoryId === filters.categoryId) &&
      (needle === "" ||
        normalizeForSearch(`${product.name} ${product.brandName} ${product.searchText}`).includes(needle)),
  );
}
