"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { type Mutation } from "@/lib/action-state";

interface ArchiveDialogProps {
  readonly item: { readonly id: string; readonly name: string; readonly productCount: number };
  /** "Marca" o "Categoría", para el aviso final ("Marca archivada."). */
  readonly kind: string;
  readonly archive: Mutation;
  readonly onArchived: (message: string) => void;
  readonly onClose: () => void;
}

/** Confirmación para archivar una marca o una categoría, explicando qué pasa con sus productos. */
export function ArchiveDialog({ item, kind, archive, onArchived, onClose }: ArchiveDialogProps): React.JSX.Element {
  return (
    <ConfirmDialog
      open
      title={`¿Archivar ${item.name}?`}
      message={`Dejará de ofrecerse al crear productos y no se verá en la página pública. ${productsKept(item.productCount)}Puedes reactivarla cuando quieras.`}
      confirmLabel="Archivar"
      onConfirm={() => archive(item.id)}
      onSuccess={() => onArchived(`${kind} archivada.`)}
      onClose={onClose}
    />
  );
}

/** "Sus 3 productos se conservan. " (vacío si no tiene productos). */
function productsKept(count: number): string {
  if (count === 0) return "";
  return count === 1 ? "Su producto se conserva. " : `Sus ${count} productos se conservan. `;
}
