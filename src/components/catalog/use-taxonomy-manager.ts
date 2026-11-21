"use client";

import { useState, useTransition } from "react";

import { type Mutation } from "@/lib/action-state";
import { type ToastMessage } from "@/components/ui/toast";

import { type TaxonomyRowActions } from "./taxonomy-list";

/** Qué ventana está abierta: crear, editar (con su id) o ninguna. */
type EditorState = { readonly mode: "create" } | { readonly mode: "edit"; readonly id: string } | null;

export interface TaxonomyManager {
  readonly editor: EditorState;
  /** Id de lo que se está editando (`null` al crear o con la ventana cerrada). */
  readonly editingId: string | null;
  readonly archiveTargetId: string | null;
  readonly toast: ToastMessage | null;
  readonly closeEditor: () => void;
  readonly closeArchive: () => void;
  readonly notify: (text: string) => void;
  /** Acciones de cada fila de la lista, ya conectadas a este estado. */
  readonly listActions: TaxonomyRowActions;
  readonly closeToast: () => void;
}

/**
 * Estado común de las pantallas de marcas y de categorías: ventana de
 * edición, confirmación de archivo, reactivación y avisos.
 * Patrón: **Custom hook** (guía de frontend §7), para no repetirlo en las dos.
 */
export function useTaxonomyManager(restoreAction: Mutation, restoredText: string): TaxonomyManager {
  const [editor, setEditor] = useState<EditorState>(null);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [, startTransition] = useTransition();

  const openCreate = (): void => setEditor({ mode: "create" });
  const openEdit = (id: string): void => setEditor({ mode: "edit", id });
  const restore = (id: string): void =>
    startTransition(async () => {
      const result = await restoreAction(id);
      setToast(
        result.ok ? { text: restoredText, severity: "success" } : { text: result.error.message, severity: "error" },
      );
    });

  return {
    editor,
    editingId: editor?.mode === "edit" ? editor.id : null,
    archiveTargetId,
    toast,
    closeEditor: () => setEditor(null),
    closeArchive: () => setArchiveTargetId(null),
    notify: (text) => setToast({ text, severity: "success" }),
    closeToast: () => setToast(null),
    listActions: { onCreate: openCreate, onEdit: openEdit, onArchive: setArchiveTargetId, onRestore: restore },
  };
}
