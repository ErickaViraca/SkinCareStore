import { Suspense } from "react";

import { ProductEditor } from "@/components/products/product-editor";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import {
  addVariantAction,
  archiveProductAction,
  archiveVariantAction,
  restoreProductAction,
  restoreVariantAction,
  updateProductAction,
  updateVariantAction,
} from "@/server/controllers/products.actions";
import {
  assignPhotoVariantAction,
  deletePhotoAction,
  movePhotoAction,
  preparePhotoUploadAction,
  registerPhotoAction,
} from "@/server/controllers/photos.actions";
import { loadPhotosEnabled, loadProductDetail, loadProductFormOptions } from "@/server/controllers/products.controller";

export const metadata = { title: "Producto · Soleil" };

export default function ProductPage({ params }: Readonly<PageProps<"/productos/[id]">>): React.JSX.Element {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <ProductSection params={params} />
    </Suspense>
  );
}

async function ProductSection({
  params,
}: {
  readonly params: PageProps<"/productos/[id]">["params"];
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const [product, options, photosEnabled] = await Promise.all([
    loadProductDetail(id),
    loadProductFormOptions(),
    loadPhotosEnabled(),
  ]);
  const brandName = options.brands.find((brand) => brand.id === product.brandId)?.label;
  return (
    <>
      <PageHeader title={product.name} subtitle={brandName ? `Productos › ${brandName}` : "Productos"} />
      <ProductEditor
        product={product}
        brands={withCurrent(options.brands, product.brandId, "Marca archivada")}
        categories={withCurrent(options.categories, product.categoryId, "Categoría archivada")}
        productActions={{ update: updateProductAction, archive: archiveProductAction, restore: restoreProductAction }}
        photosEnabled={photosEnabled}
        photoActions={{
          prepare: preparePhotoUploadAction,
          register: registerPhotoAction,
          move: movePhotoAction,
          assign: assignPhotoVariantAction,
          remove: deletePhotoAction,
        }}
        variantActions={{
          add: addVariantAction,
          update: updateVariantAction,
          archive: archiveVariantAction,
          restore: restoreVariantAction,
        }}
      />
    </>
  );
}

/**
 * Si el producto usa una marca o categoría que se archivó después, se agrega
 * a las opciones para que el selector la siga mostrando.
 */
function withCurrent(
  options: readonly { id: string; label: string }[],
  currentId: string,
  label: string,
): { id: string; label: string }[] {
  return options.some((option) => option.id === currentId) ? [...options] : [...options, { id: currentId, label }];
}
