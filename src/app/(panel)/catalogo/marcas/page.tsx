import { Suspense } from "react";

import { BrandsManager } from "@/components/catalog/brands-manager";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  archiveBrandAction,
  createBrandAction,
  restoreBrandAction,
  updateBrandAction,
} from "@/server/controllers/taxonomy.actions";
import { loadBrands } from "@/server/controllers/taxonomy.controller";

export const metadata = { title: "Marcas · Soleil" };

export default function BrandsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BrandsSection />
    </Suspense>
  );
}

async function BrandsSection(): Promise<React.JSX.Element> {
  const brands = await loadBrands();
  return (
    <BrandsManager
      brands={brands}
      actions={{
        create: createBrandAction,
        update: updateBrandAction,
        archive: archiveBrandAction,
        restore: restoreBrandAction,
      }}
    />
  );
}
