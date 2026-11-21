/**
 * Orden de la lista de categorías: cada categoría principal seguida de sus
 * subcategorías, todo por nombre. Así "Rostro → Serums" se lee como árbol.
 */
export interface OrderableCategory {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
}

const byName = (a: OrderableCategory, b: OrderableCategory): number => a.name.localeCompare(b.name, "es");

export function orderAsTree<T extends OrderableCategory>(categories: readonly T[]): T[] {
  const ids = new Set(categories.map((category) => category.id));
  // Una subcategoría cuyo padre no está en la lista se muestra como principal.
  const roots = categories.filter((category) => category.parentId === null || !ids.has(category.parentId));
  const childrenOf = (id: string): T[] => categories.filter((category) => category.parentId === id).sort(byName);
  return [...roots].sort(byName).flatMap((root) => [root, ...childrenOf(root.id)]);
}
