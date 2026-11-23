"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActions } from "@/components/ui/form-actions";
import { FormCard } from "@/components/ui/form-card";
import { Toast, type ToastMessage } from "@/components/ui/toast";
import { useFormAttempt } from "@/components/ui/use-form-attempt";
import { type Mutation } from "@/lib/action-state";

import { productInputFromForm } from "./form-data";
import { type Option, type ProductInitial, ProductFields } from "./product-fields";
import { ProductStatus } from "./product-status";
import { type PhotoActions, PhotosSection } from "./photos-section";
import { type VariantActions, type VariantItem, VariantsSection, variantLabel } from "./variants-section";

interface ProductItem extends ProductInitial {
  readonly id: string;
  readonly archived: boolean;
  readonly photos: readonly {
    readonly id: string;
    readonly url: string;
    readonly alt: string | null;
    readonly variantId: string | null;
  }[];
  readonly variants: readonly VariantItem[];
}

interface ProductActions {
  readonly update: Mutation;
  readonly archive: Mutation;
  readonly restore: Mutation;
}

interface ProductEditorProps {
  readonly product: ProductItem;
  readonly brands: readonly Option[];
  readonly categories: readonly Option[];
  readonly productActions: ProductActions;
  readonly variantActions: VariantActions;
  readonly photoActions: PhotoActions;
  readonly photosEnabled: boolean;
}

/** Ficha de producto (boceto aprobado): datos comunes arriba, variantes abajo. */
export function ProductEditor(props: ProductEditorProps): React.JSX.Element {
  const { product } = props;
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const notify = (text: string, severity: ToastMessage["severity"] = "success"): void => setToast({ text, severity });

  const [attempt, submit, pending] = useFormAttempt(
    (formData) => props.productActions.update({ id: product.id, ...productInputFromForm(formData) }),
    () => notify("Producto guardado."),
  );

  return (
    <Stack spacing={2.5} sx={{ pb: { xs: 10, md: 0 } }}>
      <ProductStatus published={product.published} comingSoon={product.comingSoon} archived={product.archived} />
      {product.archived && <ArchivedBanner restore={() => props.productActions.restore(product.id)} notify={notify} />}
      <form action={submit} noValidate>
        <FormCard
          title="Datos del producto"
          error={attempt && !attempt.result.ok ? attempt.result.error.message : null}
        >
          <ProductFields
            attempt={attempt}
            initial={product}
            brands={props.brands}
            categories={props.categories}
            imageCount={product.photos.length}
          />
        </FormCard>
        <ProductFormButtons archived={product.archived} pending={pending} onArchive={() => setConfirmArchive(true)} />
      </form>

      <PhotosSection
        productId={product.id}
        photos={product.photos}
        variants={activeVariantOptions(product.variants)}
        enabled={props.photosEnabled}
        archived={product.archived}
        actions={props.photoActions}
        notify={notify}
      />

      <VariantsSection
        productId={product.id}
        productArchived={product.archived}
        variants={product.variants}
        actions={props.variantActions}
        notify={notify}
      />

      {confirmArchive && (
        <ArchiveProductDialog
          name={product.name}
          onConfirm={() => props.productActions.archive(product.id)}
          onDone={() => {
            setConfirmArchive(false);
            notify("Producto archivado.");
          }}
          onClose={() => setConfirmArchive(false)}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </Stack>
  );
}

const ARCHIVE_MESSAGE =
  "Deja de ofrecerse en la venta y en la página pública. Sus datos, ventas y stock se conservan. Puedes reactivarlo cuando quieras.";

interface ArchivedBannerProps {
  readonly restore: () => ReturnType<Mutation>;
  readonly notify: (text: string, severity?: ToastMessage["severity"]) => void;
}

/** Aviso de producto archivado, con el botón para reactivarlo. */
function ArchivedBanner({ restore, notify }: ArchivedBannerProps): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const onRestore = (): void =>
    startTransition(async () => {
      const result = await restore();
      if (result.ok) notify("Producto reactivado.");
      else notify(result.error.message, "error");
    });
  return (
    <Alert
      severity="info"
      action={
        <Button onClick={onRestore} disabled={pending}>
          Reactivar
        </Button>
      }
    >
      Este producto está archivado: no se ofrece en la venta ni en la página pública.
    </Alert>
  );
}

interface ProductFormButtonsProps {
  readonly archived: boolean;
  readonly pending: boolean;
  readonly onArchive: () => void;
}

/** Guardar (principal), Cancelar (borde verde) y Archivar (rojo), como en el boceto. */
function ProductFormButtons({ archived, pending, onArchive }: ProductFormButtonsProps): React.JSX.Element {
  return (
    <FormActions>
      {!archived && (
        <Button variant="outlined" color="error" onClick={onArchive} disabled={pending}>
          Archivar
        </Button>
      )}
      <Button variant="outlined" color="secondary" component={Link} href="/productos" disabled={pending}>
        Cancelar
      </Button>
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </FormActions>
  );
}

/** Variantes activas como opciones del selector "Para" de cada foto. */
function activeVariantOptions(variants: readonly VariantItem[]): { id: string; label: string }[] {
  return variants
    .filter((variant) => !variant.archived)
    .map((variant) => ({ id: variant.id, label: variantLabel(variant) }));
}

interface ArchiveProductDialogProps {
  readonly name: string;
  readonly onConfirm: () => ReturnType<Mutation>;
  readonly onDone: () => void;
  readonly onClose: () => void;
}

function ArchiveProductDialog({ name, onConfirm, onDone, onClose }: ArchiveProductDialogProps): React.JSX.Element {
  return (
    <ConfirmDialog
      open
      title={`¿Archivar ${name}?`}
      message={ARCHIVE_MESSAGE}
      confirmLabel="Archivar"
      onConfirm={onConfirm}
      onSuccess={onDone}
      onClose={onClose}
    />
  );
}
