import AddOutlined from "@mui/icons-material/AddOutlined";
import { Suspense } from "react";

import { ProductList } from "@/components/products/product-list";
import { LinkButton } from "@/components/ui/link-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { loadProductFormOptions, loadProducts } from "@/server/controllers/products.controller";

export const metadata = { title: "Productos · Soleil" };

export default function ProductsPage(): React.JSX.Element {
  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo de la tienda: productos y sus tonos o tamaños."
        actions={
          <LinkButton
            href="/productos/nuevo"
            startIcon={<AddOutlined />}
            sx={{ display: { xs: "none", md: "inline-flex" } }}
          >
            Nuevo producto
          </LinkButton>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <ProductsSection />
      </Suspense>
    </>
  );
}

async function ProductsSection(): Promise<React.JSX.Element> {
  const [products, options] = await Promise.all([loadProducts(), loadProductFormOptions()]);
  return <ProductList products={products} categories={options.categories} />;
}
