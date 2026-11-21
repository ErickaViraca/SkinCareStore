"use client";

import { FormDialog } from "@/components/ui/form-dialog";
import { Toast } from "@/components/ui/toast";
import { type Mutation } from "@/lib/action-state";

import { ArchiveDialog } from "./archive-dialog";
import { NameField } from "./name-field";
import { TaxonomyList, type TaxonomyListLabels, type TaxonomyRow } from "./taxonomy-list";
import { useTaxonomyManager } from "./use-taxonomy-manager";

/** Lo que la pantalla muestra de cada marca (coincide con el DTO del servidor). */
interface BrandItem {
  readonly id: string;
  readonly name: string;
  readonly archived: boolean;
  readonly productCount: number;
}

interface BrandActions {
  readonly create: Mutation;
  readonly update: Mutation;
  readonly archive: Mutation;
  readonly restore: Mutation;
}

const LABELS: TaxonomyListLabels = {
  noun: "marca",
  createLabel: "Nueva marca",
  searchPlaceholder: "Buscar marca",
  emptyTitle: "Todavía no hay marcas",
  emptyDescription: "Crea la primera con el botón “Nueva marca”.",
};

interface BrandsManagerProps {
  readonly brands: readonly BrandItem[];
  readonly actions: BrandActions;
}

/** Pestaña "Marcas": lista, crear, renombrar, archivar y reactivar. */
export function BrandsManager({ brands, actions }: BrandsManagerProps): React.JSX.Element {
  const manager = useTaxonomyManager(actions.restore, "Marca reactivada.");
  const editing = brands.find((brand) => brand.id === manager.editingId);
  const archiving = brands.find((brand) => brand.id === manager.archiveTargetId);
  // Orden alfabético en español en la pantalla: no depende de la configuración de la base.
  const rows: TaxonomyRow[] = [...brands]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((brand) => ({ ...brand, detail: null, indent: false }));

  return (
    <>
      <TaxonomyList rows={rows} labels={LABELS} actions={manager.listActions} />

      {manager.editor && (
        <FormDialog
          open
          title={editing ? "Editar marca" : "Nueva marca"}
          submitLabel="Guardar"
          onSubmit={(formData) => {
            const name = formData.get("name");
            return editing ? actions.update({ id: editing.id, name }) : actions.create({ name });
          }}
          onSuccess={() => {
            manager.closeEditor();
            manager.notify("Marca guardada.");
          }}
          onClose={manager.closeEditor}
        >
          {(attempt) => <NameField attempt={attempt} initial={editing?.name} example="La Roche-Posay" />}
        </FormDialog>
      )}

      {archiving && (
        <ArchiveDialog
          item={archiving}
          kind="Marca"
          archive={actions.archive}
          onArchived={(message) => {
            manager.closeArchive();
            manager.notify(message);
          }}
          onClose={manager.closeArchive}
        />
      )}

      <Toast message={manager.toast} onClose={manager.closeToast} />
    </>
  );
}
