"use client";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

import { FormDialog } from "@/components/ui/form-dialog";
import { Toast } from "@/components/ui/toast";
import { type Mutation, fieldError } from "@/lib/action-state";

import { ArchiveDialog } from "./archive-dialog";
import { orderAsTree } from "./category-order";
import { NameField } from "./name-field";
import { TaxonomyList, type TaxonomyListLabels } from "./taxonomy-list";
import { useTaxonomyManager } from "./use-taxonomy-manager";

/** Lo que la pantalla muestra de cada categoría (coincide con el DTO del servidor). */
interface CategoryItem {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly parentName: string | null;
  readonly archived: boolean;
  readonly productCount: number;
}

interface CategoryActions {
  readonly create: Mutation;
  readonly update: Mutation;
  readonly archive: Mutation;
  readonly restore: Mutation;
}

const LABELS: TaxonomyListLabels = {
  noun: "categoría",
  createLabel: "Nueva categoría",
  searchPlaceholder: "Buscar categoría",
  emptyTitle: "Todavía no hay categorías",
  emptyDescription: "Crea la primera con el botón “Nueva categoría”.",
  detailHeader: "Dentro de",
};

interface CategoriesManagerProps {
  readonly categories: readonly CategoryItem[];
  readonly actions: CategoryActions;
}

/** Pestaña "Categorías": como Marcas, más la categoría padre (un solo nivel). */
export function CategoriesManager({ categories, actions }: CategoriesManagerProps): React.JSX.Element {
  const manager = useTaxonomyManager(actions.restore, "Categoría reactivada.");
  const editing = categories.find((category) => category.id === manager.editingId);
  const archiving = categories.find((category) => category.id === manager.archiveTargetId);
  const rows = orderAsTree(categories).map((category) => ({
    ...category,
    detail: category.parentName,
    indent: category.parentId !== null,
  }));

  return (
    <>
      <TaxonomyList rows={rows} labels={LABELS} actions={manager.listActions} />

      {manager.editor && (
        <FormDialog
          open
          title={editing ? "Editar categoría" : "Nueva categoría"}
          submitLabel="Guardar"
          onSubmit={(formData) => {
            const input = { name: formData.get("name"), parentId: formData.get("parentId") };
            return editing ? actions.update({ id: editing.id, ...input }) : actions.create(input);
          }}
          onSuccess={() => {
            manager.closeEditor();
            manager.notify("Categoría guardada.");
          }}
          onClose={manager.closeEditor}
        >
          {(attempt) => (
            <>
              <NameField attempt={attempt} initial={editing?.name} example="Rostro o Sérums" />
              <ParentField
                key={`parent-${attempt?.count ?? 0}`}
                categories={categories}
                editing={editing}
                defaultValue={attempt?.values.parentId ?? editing?.parentId ?? ""}
                error={fieldError(attempt?.result, "parentId")}
              />
            </>
          )}
        </FormDialog>
      )}

      {archiving && (
        <ArchiveDialog
          item={archiving}
          kind="Categoría"
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

interface ParentFieldProps {
  readonly categories: readonly CategoryItem[];
  readonly editing: CategoryItem | undefined;
  readonly defaultValue: string;
  readonly error: string | undefined;
}

/**
 * "Dentro de": solo categorías principales activas (un solo nivel). Si la
 * categoría ya tiene subcategorías, no puede ir dentro de otra.
 */
function ParentField({ categories, editing, defaultValue, error }: ParentFieldProps): React.JSX.Element {
  const hasSubcategories = editing !== undefined && categories.some((category) => category.parentId === editing.id);
  const options = orderAsTree(
    categories.filter((category) => category.parentId === null && !category.archived && category.id !== editing?.id),
  );
  // Si el padre actual ya no es una opción (por ejemplo, archivado), se muestra igual para no perderlo.
  const current = categories.find((category) => category.id === defaultValue);
  const extra = current && !options.includes(current) ? [current] : [];

  return (
    <TextField
      select
      name="parentId"
      label="Dentro de"
      defaultValue={defaultValue}
      disabled={hasSubcategories}
      // Muestra "Ninguna" cuando no hay padre, en vez de dejar el campo vacío.
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      error={Boolean(error)}
      helperText={
        error ??
        (hasSubcategories
          ? "Tiene subcategorías: debe seguir siendo principal."
          : "Déjalo vacío para una categoría principal.")
      }
    >
      <MenuItem value="">
        <em>Ninguna (categoría principal)</em>
      </MenuItem>
      {[...options, ...extra].map((category) => (
        <MenuItem key={category.id} value={category.id}>
          {category.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
