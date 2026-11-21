import { Suspense } from "react";

import { CategoriesManager } from "@/components/catalog/categories-manager";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  archiveCategoryAction,
  createCategoryAction,
  restoreCategoryAction,
  updateCategoryAction,
} from "@/server/controllers/taxonomy.actions";
import { loadCategories } from "@/server/controllers/taxonomy.controller";

export const metadata = { title: "Categorías · Soleil" };

export default function CategoriesPage(): React.JSX.Element {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CategoriesSection />
    </Suspense>
  );
}

async function CategoriesSection(): Promise<React.JSX.Element> {
  const categories = await loadCategories();
  return (
    <CategoriesManager
      categories={categories}
      actions={{
        create: createCategoryAction,
        update: updateCategoryAction,
        archive: archiveCategoryAction,
        restore: restoreCategoryAction,
      }}
    />
  );
}
