import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/server/controllers/session.controller";

/** Inicio del panel. Los indicadores y avisos (docs/UI.md §1) llegan con las operaciones (etapa 4). */
export default async function HomePage(): Promise<React.JSX.Element> {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title={`Hola, ${admin.name}`} subtitle="Bienvenida al panel de Soleil." />
      <EmptyState
        title="El panel está en construcción"
        description="Aquí verás las ventas del día, la ganancia del mes, los saldos y los avisos para atender."
      />
    </>
  );
}
