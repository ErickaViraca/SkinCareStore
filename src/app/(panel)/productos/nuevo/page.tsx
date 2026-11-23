import { Suspense } from "react";

import { NewProductForm } from "@/components/products/new-product-form";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { createProductAction } from "@/server/controllers/products.actions";
import { loadProductFormOptions } from "@/server/controllers/products.controller";

export const metadata = { title: "Nuevo producto · Soleil" };

export default function NewProductPage(): React.JSX.Element {
  return (
    <>
      <PageHeader title="Nuevo producto" subtitle="Los datos del producto y su primera variante." />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <NewProductSection />
      </Suspense>
    </>
  );
}

async function NewProductSection(): Promise<React.JSX.Element> {
  const { brands, categories } = await loadProductFormOptions();
  return <NewProductForm brands={brands} categories={categories} create={createProductAction} />;
}
