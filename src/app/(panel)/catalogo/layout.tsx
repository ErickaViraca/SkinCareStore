import { TaxonomyTabs } from "@/components/catalog/taxonomy-tabs";
import { PageHeader } from "@/components/ui/page-header";

/** Encabezado y pestañas comunes de "Marcas y categorías". */
export default function CatalogLayout({ children }: LayoutProps<"/catalogo">): React.JSX.Element {
  return (
    <>
      <PageHeader
        title="Marcas y categorías"
        subtitle="Para ordenar los productos y filtrarlos en la página pública."
      />
      <TaxonomyTabs />
      {children}
    </>
  );
}
