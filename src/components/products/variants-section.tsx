"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusChip } from "@/components/ui/status-chip";
import { type ToastMessage } from "@/components/ui/toast";
import { type Cents, formatBs } from "@/domain/money";
import { type Mutation } from "@/lib/action-state";

import { variantInputFromForm } from "./form-data";
import { type VariantInitial, VariantFields } from "./variant-fields";

/** Lo que la ficha muestra de cada variante (coincide con el DTO del servidor). */
export interface VariantItem extends VariantInitial {
  readonly id: string;
  readonly archived: boolean;
  readonly sellable: number;
  readonly averageCostCents: number | null;
  readonly minimumPriceCents: number | null;
}

export interface VariantActions {
  readonly add: Mutation;
  readonly update: Mutation;
  readonly archive: Mutation;
  readonly restore: Mutation;
}

interface VariantsSectionProps {
  readonly productId: string;
  readonly productArchived: boolean;
  readonly variants: readonly VariantItem[];
  readonly actions: VariantActions;
  readonly notify: (text: string, severity?: ToastMessage["severity"]) => void;
}

const money = (amount: number | null): string => (amount === null ? "—" : formatBs(amount as Cents));

/** "Tono 110 · 30 ml", o "Única" si no tiene tono ni tamaño. */
export function variantLabel(variant: Pick<VariantItem, "shade" | "presentation">): string {
  return [variant.shade, variant.presentation].filter(Boolean).join(" · ") || "Única";
}

type Editor = { readonly mode: "add" } | { readonly mode: "edit"; readonly variant: VariantItem } | null;

/**
 * Variantes del producto: tono y/o tamaño, código, precio, precio mínimo y
 * stock. El costo y el precio mínimo aparecen cuando haya compras (etapa 4).
 */
export function VariantsSection(props: VariantsSectionProps): React.JSX.Element {
  const [editor, setEditor] = useState<Editor>(null);
  const [archiving, setArchiving] = useState<VariantItem | null>(null);
  const [, startTransition] = useTransition();

  const restore = (variant: VariantItem): void =>
    startTransition(async () => {
      const result = await props.actions.restore(variant.id);
      if (result.ok) props.notify("Variante reactivada.");
      else props.notify(result.error.message, "error");
    });

  const editing = editor?.mode === "edit" ? editor.variant : undefined;

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <VariantsHeader canAdd={!props.productArchived} onAdd={() => setEditor({ mode: "add" })} />

        <VariantsTable
          variants={props.variants}
          onEdit={(variant) => setEditor({ mode: "edit", variant })}
          onArchive={setArchiving}
          onRestore={restore}
        />
      </CardContent>

      {editor && (
        <VariantEditorDialog
          productId={props.productId}
          editing={editing}
          actions={props.actions}
          onDone={() => {
            setEditor(null);
            props.notify("Variante guardada.");
          }}
          onClose={() => setEditor(null)}
        />
      )}

      {archiving && (
        <ConfirmDialog
          open
          title={`¿Archivar ${variantLabel(archiving)}?`}
          message="Deja de ofrecerse en la venta y en la página pública. Su historial y su stock se conservan."
          confirmLabel="Archivar"
          onConfirm={() => props.actions.archive(archiving.id)}
          onSuccess={() => {
            setArchiving(null);
            props.notify("Variante archivada.");
          }}
          onClose={() => setArchiving(null)}
        />
      )}
    </Card>
  );
}

/** Título de la sección y botón "Agregar tono o tamaño". */
function VariantsHeader({
  canAdd,
  onAdd,
}: {
  readonly canAdd: boolean;
  readonly onAdd: () => void;
}): React.JSX.Element {
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}
    >
      <Box>
        <Typography variant="h2">Variantes</Typography>
        <Typography color="text.secondary" variant="body2">
          El costo y el precio mínimo aparecen cuando se registren compras.
        </Typography>
      </Box>
      {canAdd && (
        <Button variant="outlined" color="secondary" startIcon={<AddOutlined />} onClick={onAdd}>
          Agregar tono o tamaño
        </Button>
      )}
    </Box>
  );
}

interface VariantEditorDialogProps {
  readonly productId: string;
  readonly editing: VariantItem | undefined;
  readonly actions: VariantActions;
  readonly onDone: () => void;
  readonly onClose: () => void;
}

/** Ventana para agregar o editar un tono o tamaño. */
function VariantEditorDialog({
  productId,
  editing,
  actions,
  onDone,
  onClose,
}: VariantEditorDialogProps): React.JSX.Element {
  return (
    <FormDialog
      open
      title={editing ? `Editar ${variantLabel(editing)}` : "Agregar tono o tamaño"}
      submitLabel="Guardar"
      onSubmit={(formData) => {
        const variant = variantInputFromForm(formData);
        return editing ? actions.update({ id: editing.id, variant }) : actions.add({ productId, variant });
      }}
      onSuccess={onDone}
      onClose={onClose}
    >
      {(attempt) => <VariantFields attempt={attempt} initial={editing} />}
    </FormDialog>
  );
}

interface VariantsTableProps {
  readonly variants: readonly VariantItem[];
  readonly onEdit: (variant: VariantItem) => void;
  readonly onArchive: (variant: VariantItem) => void;
  readonly onRestore: (variant: VariantItem) => void;
}

/** Tabla en la computadora y tarjetas en el celular. */
function VariantsTable(props: VariantsTableProps): React.JSX.Element {
  return (
    <>
      <Table sx={{ display: { xs: "none", md: "table" } }}>
        <TableHead>
          <TableRow>
            <TableCell>Tono / tamaño</TableCell>
            <TableCell>Código</TableCell>
            <TableCell align="right">Precio</TableCell>
            <TableCell align="right">Precio mínimo</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.variants.map((variant) => (
            <TableRow key={variant.id} sx={{ opacity: variant.archived ? 0.6 : 1 }}>
              <TableCell>
                <VariantName variant={variant} />
              </TableCell>
              <TableCell sx={{ fontFamily: "monospace" }}>{variant.sku}</TableCell>
              <TableCell align="right" sx={NUMBER}>
                {money(variant.salePriceCents)}
              </TableCell>
              <TableCell align="right" sx={{ ...NUMBER, color: "text.secondary" }}>
                {variant.minimumPriceCents === null ? "Sin compras" : money(variant.minimumPriceCents)}
              </TableCell>
              <TableCell align="right">{variant.sellable}</TableCell>
              <TableCell align="right">
                <VariantRowActions variant={variant} {...props} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Stack spacing={1.5} useFlexGap sx={{ display: { md: "none" } }}>
        {props.variants.map((variant) => (
          <Box key={variant.id} sx={{ ...CARD, opacity: variant.archived ? 0.6 : 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <VariantName variant={variant} />
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {variant.sku}
              </Typography>
              <Typography variant="body2">
                {money(variant.salePriceCents)} · Stock {variant.sellable}
              </Typography>
            </Box>
            <VariantRowActions variant={variant} {...props} />
          </Box>
        ))}
      </Stack>
    </>
  );
}

const NUMBER = { fontVariantNumeric: "tabular-nums" } as const;
const CARD = {
  border: 1,
  borderColor: "divider",
  borderRadius: 3,
  p: 1.5,
  display: "flex",
  alignItems: "center",
} as const;

/** Nombre de la variante con su estado (archivada u oculta). */
function VariantName({ variant }: { readonly variant: VariantItem }): React.JSX.Element {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography sx={{ fontWeight: 600 }}>{variantLabel(variant)}</Typography>
      {variant.archived && <StatusChip label="Archivada" />}
      {!variant.archived && !variant.published && <StatusChip label="Oculta" />}
    </Stack>
  );
}

function VariantRowActions({
  variant,
  onEdit,
  onArchive,
  onRestore,
}: Omit<VariantsTableProps, "variants"> & { readonly variant: VariantItem }): React.JSX.Element {
  const label = variantLabel(variant);
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
      <Tooltip title="Editar">
        <IconButton aria-label={`Editar ${label}`} color="secondary" onClick={() => onEdit(variant)}>
          <EditOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      {variant.archived ? (
        <Tooltip title="Reactivar">
          <IconButton aria-label={`Reactivar ${label}`} color="secondary" onClick={() => onRestore(variant)}>
            <UnarchiveOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Archivar">
          <IconButton aria-label={`Archivar ${label}`} color="error" onClick={() => onArchive(variant)}>
            <ArchiveOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
