"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { FormActions } from "@/components/ui/form-actions";
import { FormCard } from "@/components/ui/form-card";
import { useFormAttempt } from "@/components/ui/use-form-attempt";
import { type MutationResultWith } from "@/lib/action-state";

import { productInputFromForm, variantInputFromForm } from "./form-data";
import { type Option, ProductFields } from "./product-fields";
import { VariantFields } from "./variant-fields";

interface NewProductFormProps {
  readonly brands: readonly Option[];
  readonly categories: readonly Option[];
  readonly create: (input: unknown) => Promise<MutationResultWith<{ id: string }>>;
}

/**
 * Alta de producto (opción A aprobada): en una sola pantalla, los datos del
 * producto y su primera variante. Los demás tonos o tamaños se agregan desde la ficha.
 */
export function NewProductForm(props: NewProductFormProps): React.JSX.Element {
  const [formKey, setFormKey] = useState(0);
  const created = useRef(false);

  // Next.js conserva oculta esta página al navegar (Activity, guía "Preserving UI state").
  // Después de crear un producto, el formulario se vacía al ocultarse, para que
  // la próxima visita a "Nuevo producto" empiece en blanco.
  useLayoutEffect(
    () => () => {
      if (created.current) {
        created.current = false;
        setFormKey((key) => key + 1);
      }
    },
    [],
  );

  return <NewProductFormBody key={formKey} {...props} onCreated={() => (created.current = true)} />;
}

function NewProductFormBody({
  brands,
  categories,
  create,
  onCreated,
}: NewProductFormProps & { readonly onCreated: () => void }): React.JSX.Element {
  const router = useRouter();
  const [attempt, submit, pending] = useFormAttempt(
    async (formData) => {
      const result = await create({ ...productInputFromForm(formData), variant: variantInputFromForm(formData) });
      // Guardado: se abre la ficha del producto nuevo, donde se agregan más tonos o tamaños.
      if (result.ok) {
        onCreated();
        router.push(`/productos/${result.data.id}`);
      }
      return result;
    },
    () => undefined,
  );

  const generalError = attempt && !attempt.result.ok && !attempt.result.error.fieldErrors;

  return (
    <form action={submit} noValidate>
      <Stack spacing={2.5} sx={{ pb: { xs: 10, md: 0 } }}>
        {generalError && !attempt.result.ok && <Alert severity="error">{attempt.result.error.message}</Alert>}
        {attempt && !attempt.result.ok && attempt.result.error.fieldErrors && (
          <Alert severity="error">Revisa los datos marcados.</Alert>
        )}
        <FormCard title="Producto">
          <ProductFields attempt={attempt} brands={brands} categories={categories} imageCount={0} />
        </FormCard>
        <FormCard
          title="Primera variante"
          subtitle="Si tiene varios tonos o tamaños, después los agregas desde la ficha del producto."
        >
          <VariantFields attempt={attempt} />
        </FormCard>
        <FormActions>
          <Button variant="outlined" color="secondary" component={Link} href="/productos" disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
