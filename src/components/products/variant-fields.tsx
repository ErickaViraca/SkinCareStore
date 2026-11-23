"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useState } from "react";

import { type FormAttempt, initialValue } from "@/components/ui/use-form-attempt";
import { fieldError } from "@/lib/action-state";

import { VARIANT_PREFIX, centsToInput } from "./form-data";

/** Valores guardados de una variante (al editar). Montos en centavos. */
export interface VariantInitial {
  readonly sku: string;
  readonly barcode: string | null;
  readonly shade: string | null;
  readonly presentation: string | null;
  readonly salePriceCents: number;
  readonly minStock: number | null;
  readonly marginMode: "pct" | "fixed" | "max" | null;
  readonly marginPct: string | null;
  readonly marginFixedCents: number | null;
  readonly published: boolean;
}

interface VariantFieldsProps {
  readonly attempt: FormAttempt | null;
  readonly initial?: VariantInitial;
}

const MARGIN_MODES = [
  { value: "", label: "Usar el de la tienda" },
  { value: "pct", label: "Porcentaje sobre el costo" },
  { value: "fixed", label: "Monto fijo sobre el costo" },
  { value: "max", label: "El mayor de los dos" },
] as const;

/**
 * Campos de una variante (tono y/o tamaño): se usan al crear el producto
 * (primera variante) y en la ventana de agregar o editar una variante.
 */
export function VariantFields({ attempt, initial }: VariantFieldsProps): React.JSX.Element {
  const [marginMode, setMarginMode] = useState(initialValue(attempt, fieldName("marginMode"), initial?.marginMode));
  const [published, setPublished] = useState(initial?.published ?? true);
  const field = (spec: FieldSpec): React.JSX.Element => <VariantTextField attempt={attempt} spec={spec} />;
  const saved = savedValues(initial);

  return (
    <Grid container spacing={2}>
      {MAIN_FIELDS.map((spec) => (
        <Grid key={spec.field} size={{ xs: 12, sm: 6 }}>
          {field({ ...spec, saved: saved[spec.field] })}
        </Grid>
      ))}
      <MarginFields
        marginMode={marginMode}
        onMarginModeChange={setMarginMode}
        modeKey={`marginMode-${attempt?.count ?? 0}`}
        modeName={fieldName("marginMode")}
        pctField={field({ ...PCT_FIELD, saved: saved.marginPct })}
        fixedField={field({ ...FIXED_FIELD, saved: saved.marginFixed })}
      />
      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              name={fieldName("published")}
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
            />
          }
          label="Visible en la página pública (si el producto está publicado)"
        />
      </Grid>
    </Grid>
  );
}

const fieldName = (field: string): string => `${VARIANT_PREFIX}${field}`;

/** Un campo de texto de la variante y su configuración. */
interface FieldSpec {
  readonly field: string;
  readonly label: string;
  readonly helperText?: string;
  readonly required?: boolean;
  readonly kind?: "money" | "number" | "percent";
  readonly saved?: string | null;
}

const MAIN_FIELDS: readonly FieldSpec[] = [
  { field: "shade", label: "Tono", helperText: "Opcional. Ej.: 110 o Nude" },
  { field: "presentation", label: "Tamaño", helperText: "Opcional. Ej.: 200 ml" },
  { field: "salePrice", label: "Precio de venta", helperText: "Ej.: 289,90", required: true, kind: "money" },
  { field: "minStock", label: "Stock mínimo", helperText: "Vacío: usa el de la tienda", kind: "number" },
  { field: "sku", label: "Código (SKU)", helperText: "Vacío: se genera solo. Puedes poner el código de fábrica." },
  { field: "barcode", label: "Código de barras", helperText: "Opcional" },
];
const PCT_FIELD: FieldSpec = {
  field: "marginPct",
  label: "Porcentaje",
  helperText: "Vacío: el de la tienda",
  kind: "percent",
};
const FIXED_FIELD: FieldSpec = { field: "marginFixed", label: "Monto fijo", required: true, kind: "money" };

/** Valores guardados como texto para los campos (montos "289,90"). */
function savedValues(initial: VariantInitial | undefined): Readonly<Record<string, string | null>> {
  return {
    shade: initial?.shade ?? null,
    presentation: initial?.presentation ?? null,
    salePrice: centsToInput(initial?.salePriceCents ?? null),
    minStock: initial?.minStock?.toString() ?? null,
    sku: initial?.sku ?? null,
    barcode: initial?.barcode ?? null,
    marginPct: initial?.marginPct ?? null,
    marginFixed: centsToInput(initial?.marginFixedCents ?? null),
  };
}

const ADORNMENTS = {
  money: { startAdornment: <InputAdornment position="start">Bs</InputAdornment> },
  percent: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
  number: {},
} as const;

const INPUT_MODES = { money: "decimal", percent: "decimal", number: "numeric" } as const;

/** Campo de texto que conserva lo escrito y muestra el error del servidor debajo. */
function VariantTextField({
  attempt,
  spec,
}: {
  readonly attempt: FormAttempt | null;
  readonly spec: FieldSpec;
}): React.JSX.Element {
  const name = fieldName(spec.field);
  const error = fieldError(attempt?.result, name, spec.field);
  return (
    <TextField
      key={`${spec.field}-${attempt?.count ?? 0}`}
      name={name}
      label={spec.label}
      required={spec.required}
      defaultValue={initialValue(attempt, name, spec.saved)}
      error={Boolean(error)}
      helperText={error ?? spec.helperText}
      fullWidth
      slotProps={
        spec.kind ? { input: ADORNMENTS[spec.kind], htmlInput: { inputMode: INPUT_MODES[spec.kind] } } : undefined
      }
    />
  );
}

interface MarginFieldsProps {
  readonly marginMode: string;
  readonly onMarginModeChange: (mode: string) => void;
  readonly modeKey: string;
  readonly modeName: string;
  readonly pctField: React.JSX.Element;
  readonly fixedField: React.JSX.Element;
}

/** Margen mínimo (§4.5): el de la tienda, porcentaje, monto fijo o el mayor de los dos. */
function MarginFields(props: MarginFieldsProps): React.JSX.Element {
  const { marginMode } = props;
  return (
    <>
      <Grid size={{ xs: 12, sm: marginMode === "" ? 12 : 6 }}>
        <TextField
          key={props.modeKey}
          select
          name={props.modeName}
          label="Margen mínimo"
          value={marginMode}
          onChange={(event) => props.onMarginModeChange(event.target.value)}
          fullWidth
          helperText="Con él se calcula el precio mínimo cuando haya compras."
        >
          {MARGIN_MODES.map((mode) => (
            <MenuItem key={mode.value} value={mode.value}>
              {mode.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {(marginMode === "pct" || marginMode === "max") && (
        <Grid size={{ xs: 12, sm: marginMode === "max" ? 3 : 6 }}>{props.pctField}</Grid>
      )}
      {(marginMode === "fixed" || marginMode === "max") && (
        <Grid size={{ xs: 12, sm: marginMode === "max" ? 3 : 6 }}>{props.fixedField}</Grid>
      )}
    </>
  );
}
