"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { NameField } from "@/components/catalog/name-field";
import { type FormAttempt, initialValue } from "@/components/ui/use-form-attempt";
import { SKIN_TYPES } from "@/domain/skin-types";
import { fieldError } from "@/lib/action-state";
import { SKIN_TYPE_LABELS } from "@/lib/skin-types";

/** Valores guardados del producto (al editar). */
export interface ProductInitial {
  readonly name: string;
  readonly brandId: string;
  readonly categoryId: string;
  readonly description: string;
  readonly usageInstructions: string | null;
  readonly skinTypes: readonly string[];
  readonly published: boolean;
  readonly featured: boolean;
  readonly comingSoon: boolean;
}

export interface Option {
  readonly id: string;
  readonly label: string;
}

interface ProductFieldsProps {
  readonly attempt: FormAttempt | null;
  readonly initial?: ProductInitial;
  readonly brands: readonly Option[];
  readonly categories: readonly Option[];
  /** Cantidad de fotos: si es 0 y se publica, se avisa (no se impide). */
  readonly imageCount: number;
}

/** Datos comunes del producto: nombre, marca, categoría, textos, tipos de piel y estado. */
export function ProductFields({
  attempt,
  initial,
  brands,
  categories,
  imageCount,
}: ProductFieldsProps): React.JSX.Element {
  const error = (field: string): string | undefined => fieldError(attempt?.result, field);
  const [skinTypes, setSkinTypes] = useState<readonly string[]>(initial?.skinTypes ?? []);
  const [published, setPublished] = useState(initial?.published ?? false);

  const toggleSkinType = (type: string): void =>
    setSkinTypes((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <NameField
          attempt={attempt}
          initial={initial?.name}
          label="Nombre del producto"
          example="Effaclar Gel Purificante (sin la marca)"
          maxLength={120}
          autoFocus={false}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <OptionSelect attempt={attempt} field="brandId" label="Marca" options={brands} saved={initial?.brandId} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <OptionSelect
          attempt={attempt}
          field="categoryId"
          label="Categoría"
          options={categories}
          saved={initial?.categoryId}
        />
      </Grid>
      <Grid size={12}>
        <SkinTypesField selected={skinTypes} onToggle={toggleSkinType} error={error("skinTypes")} />
      </Grid>
      <ProductTextFields attempt={attempt} initial={initial} />
      <Grid size={12}>
        <StatusSwitches
          initial={initial}
          published={published}
          onPublishedChange={setPublished}
          imageCount={imageCount}
        />
      </Grid>
    </Grid>
  );
}

interface SkinTypesFieldProps {
  readonly selected: readonly string[];
  readonly onToggle: (type: string) => void;
  readonly error: string | undefined;
}

/** Tipos de piel como pastillas que se marcan y desmarcan (lista fija). */
function SkinTypesField({ selected, onToggle, error }: SkinTypesFieldProps): React.JSX.Element {
  return (
    <>
      <Typography variant="overline">Tipos de piel</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
        {SKIN_TYPES.map((type) => {
          const isSelected = selected.includes(type);
          return (
            <Chip
              key={type}
              label={SKIN_TYPE_LABELS[type]}
              onClick={() => onToggle(type)}
              color={isSelected ? "secondary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
              aria-pressed={isSelected}
            />
          );
        })}
      </Stack>
      {selected.map((type) => (
        <input key={type} type="hidden" name="skinTypes" value={type} />
      ))}
      {error && <FormHelperText error>{error}</FormHelperText>}
    </>
  );
}

interface StatusSwitchesProps {
  readonly initial: ProductInitial | undefined;
  readonly published: boolean;
  readonly onPublishedChange: (published: boolean) => void;
  readonly imageCount: number;
}

/**
 * Publicado, Destacado y "Disponible pronto", con el aviso de fotos.
 * Son casillas controladas: así conservan lo marcado aunque el formulario se
 * envíe con errores o la ficha se vuelva a cargar después de guardar.
 */
function StatusSwitches({ initial, published, onPublishedChange, imageCount }: StatusSwitchesProps): React.JSX.Element {
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [comingSoon, setComingSoon] = useState(initial?.comingSoon ?? false);
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3 }}>
        <FormControlLabel
          control={
            <Switch
              name="published"
              checked={published}
              onChange={(event) => onPublishedChange(event.target.checked)}
            />
          }
          label="Publicado en la página pública"
        />
        <FormControlLabel
          control={
            <Switch name="featured" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          }
          label="Destacado"
        />
        <FormControlLabel
          control={
            <Switch name="comingSoon" checked={comingSoon} onChange={(event) => setComingSoon(event.target.checked)} />
          }
          label="Disponible pronto"
        />
      </Box>
      <FormHelperText>
        “Disponible pronto”: si no hay stock, la página pública lo muestra así en vez de “Agotado”. Con stock no cambia
        nada.
      </FormHelperText>
      {published && imageCount === 0 && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Este producto no tiene fotos: en la página pública se verá sin imagen.
        </Alert>
      )}
    </>
  );
}

/** Descripción y modo de uso (textos largos que se ven en la página pública). */
function ProductTextFields({
  attempt,
  initial,
}: {
  readonly attempt: FormAttempt | null;
  readonly initial: ProductInitial | undefined;
}): React.JSX.Element {
  const key = attempt?.count ?? 0;
  const fields = [
    {
      name: "description",
      label: "Descripción",
      rows: 3,
      help: "Se muestra en la página pública.",
      saved: initial?.description,
    },
    { name: "usageInstructions", label: "Modo de uso", rows: 2, help: "Opcional.", saved: initial?.usageInstructions },
  ] as const;
  return (
    <>
      {fields.map((field) => {
        const error = fieldError(attempt?.result, field.name);
        return (
          <Grid key={field.name} size={12}>
            <TextField
              key={`${field.name}-${key}`}
              name={field.name}
              label={field.label}
              multiline
              minRows={field.rows}
              fullWidth
              defaultValue={initialValue(attempt, field.name, field.saved)}
              error={Boolean(error)}
              helperText={error ?? field.help}
            />
          </Grid>
        );
      })}
    </>
  );
}

interface OptionSelectProps {
  readonly attempt: FormAttempt | null;
  readonly field: "brandId" | "categoryId";
  readonly label: string;
  readonly options: readonly Option[];
  readonly saved: string | undefined;
}

/** Selector de marca o categoría (solo las activas). */
function OptionSelect({ attempt, field, label, options, saved }: OptionSelectProps): React.JSX.Element {
  const error = fieldError(attempt?.result, field);
  return (
    <TextField
      key={`${field}-${attempt?.count ?? 0}`}
      select
      required
      name={field}
      label={label}
      defaultValue={initialValue(attempt, field, saved)}
      error={Boolean(error)}
      helperText={error ?? (options.length === 0 ? "Primero crea una en Marcas y categorías." : " ")}
      fullWidth
    >
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
