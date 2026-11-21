"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Fab from "@mui/material/Fab";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { StatusChip } from "@/components/ui/status-chip";

import { filterRows } from "./taxonomy-filter";

/** Una fila de la lista (marca o categoría). */
export interface TaxonomyRow {
  readonly id: string;
  readonly name: string;
  /** Texto secundario, por ejemplo la categoría padre. */
  readonly detail: string | null;
  /** Se muestra con sangría (subcategoría). */
  readonly indent: boolean;
  readonly productCount: number;
  readonly archived: boolean;
}

export interface TaxonomyListLabels {
  /** "marca" o "categoría", para los textos de ayuda. */
  readonly noun: string;
  readonly createLabel: string;
  readonly searchPlaceholder: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  /** Encabezado de la columna de detalle; sin él, la columna no se muestra. */
  readonly detailHeader?: string;
}

export interface TaxonomyRowActions {
  readonly onCreate: () => void;
  readonly onEdit: (id: string) => void;
  readonly onArchive: (id: string) => void;
  readonly onRestore: (id: string) => void;
}

interface TaxonomyListProps {
  readonly rows: readonly TaxonomyRow[];
  readonly labels: TaxonomyListLabels;
  readonly actions: TaxonomyRowActions;
}

/**
 * Lista de marcas o de categorías con buscador y "Ver archivadas".
 * Computadora: tabla. Celular: tarjetas y botón flotante "+ Nueva"
 * (docs/UI.md, lista de productos). Patrón: **Composición**: no sabe qué es
 * una marca; recibe filas, textos y acciones.
 */
export function TaxonomyList({ rows, labels, actions }: TaxonomyListProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const visible = filterRows(rows, query, showArchived);
  const archivedCount = rows.filter((row) => row.archived).length;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <SearchField value={query} onChange={setQuery} placeholder={labels.searchPlaceholder} />
        <FormControlLabel
          control={<Switch checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />}
          label={`Ver archivadas (${archivedCount})`}
        />
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={actions.onCreate}
          sx={{ display: { xs: "none", md: "inline-flex" }, ml: "auto" }}
        >
          {labels.createLabel}
        </Button>
      </Box>

      {visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? labels.emptyTitle : "Sin resultados"}
          description={rows.length === 0 ? labels.emptyDescription : `Ninguna ${labels.noun} coincide con la búsqueda.`}
        />
      ) : (
        <>
          <DesktopTable rows={visible} labels={labels} actions={actions} />
          <MobileCards rows={visible} actions={actions} />
        </>
      )}

      <Fab
        color="primary"
        variant="extended"
        onClick={actions.onCreate}
        sx={{ display: { md: "none" }, position: "fixed", right: 16, bottom: 80 }}
      >
        <AddOutlined sx={{ mr: 0.5 }} />
        Nueva
      </Fab>
    </Stack>
  );
}

function DesktopTable({ rows, labels, actions }: TaxonomyListProps): React.JSX.Element {
  return (
    <Card sx={{ display: { xs: "none", md: "block" } }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            {labels.detailHeader && <TableCell>{labels.detailHeader}</TableCell>}
            <TableCell align="right">Productos</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell sx={{ pl: row.indent ? 6 : 2 }}>
                <RowName row={row} />
              </TableCell>
              {labels.detailHeader && <TableCell sx={{ color: "text.secondary" }}>{row.detail ?? "—"}</TableCell>}
              <TableCell align="right">{row.productCount}</TableCell>
              <TableCell align="right">
                <RowActions row={row} actions={actions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function MobileCards({ rows, actions }: Omit<TaxonomyListProps, "labels">): React.JSX.Element {
  return (
    <Stack spacing={1.5} useFlexGap sx={{ display: { md: "none" } }}>
      {rows.map((row) => (
        <Card key={row.id} sx={{ px: 2, py: 1.5, ml: row.indent ? 3 : 0, display: "flex", alignItems: "center" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RowName row={row} />
            <Typography variant="body2" color="text.secondary">
              {row.detail ? `${row.detail} · ` : ""}
              {row.productCount} {row.productCount === 1 ? "producto" : "productos"}
            </Typography>
          </Box>
          <RowActions row={row} actions={actions} />
        </Card>
      ))}
    </Stack>
  );
}

function RowName({ row }: { readonly row: TaxonomyRow }): React.JSX.Element {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography sx={{ fontWeight: 600 }} color={row.archived ? "text.secondary" : "text.primary"}>
        {row.name}
      </Typography>
      {row.archived && <StatusChip label="Archivada" />}
    </Box>
  );
}

function RowActions({
  row,
  actions,
}: {
  readonly row: TaxonomyRow;
  readonly actions: TaxonomyRowActions;
}): React.JSX.Element {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
      <Tooltip title="Editar">
        <IconButton aria-label={`Editar ${row.name}`} color="secondary" onClick={() => actions.onEdit(row.id)}>
          <EditOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      {row.archived ? (
        <Tooltip title="Reactivar">
          <IconButton aria-label={`Reactivar ${row.name}`} color="secondary" onClick={() => actions.onRestore(row.id)}>
            <UnarchiveOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Archivar">
          <IconButton aria-label={`Archivar ${row.name}`} color="error" onClick={() => actions.onArchive(row.id)}>
            <ArchiveOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
