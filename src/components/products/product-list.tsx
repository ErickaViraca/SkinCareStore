"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { type Cents, formatBs } from "@/domain/money";

import { type ProductStatusFilter, filterProducts } from "./product-filters";
import { ProductStatus } from "./product-status";
import { ProductThumb } from "./product-thumb";

/** Lo que la lista muestra de cada producto (coincide con el DTO del servidor). */
interface ProductItem {
  readonly id: string;
  readonly name: string;
  readonly brandName: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly published: boolean;
  readonly comingSoon: boolean;
  readonly archived: boolean;
  readonly variantCount: number;
  readonly priceFromCents: number | null;
  readonly searchText: string;
  readonly thumbnailUrl: string | null;
}

interface CategoryOption {
  readonly id: string;
  readonly label: string;
}

interface ProductListProps {
  readonly products: readonly ProductItem[];
  readonly categories: readonly CategoryOption[];
}

const STATUS_FILTERS: readonly { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Borradores" },
  { value: "coming_soon", label: "Disponible pronto" },
  { value: "archived", label: "Archivados" },
];

const priceFrom = (product: ProductItem): string =>
  product.priceFromCents === null ? "—" : `desde ${formatBs(product.priceFromCents as Cents)}`;

const variantsLabel = (count: number): string => (count === 1 ? "1 variante" : `${count} variantes`);

/**
 * Lista de productos (docs/UI.md, boceto aprobado): buscador, pastillas de
 * estado y categoría; tabla en la computadora y tarjetas en el celular.
 */
export function ProductList({ products, categories }: ProductListProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const visible = filterProducts(products, { query, status, categoryId });

  return (
    <Stack spacing={2}>
      <ProductFiltersBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories}
      />

      {visible.length === 0 ? (
        <EmptyState
          title={products.length === 0 ? "Todavía no hay productos" : "Sin resultados"}
          description={
            products.length === 0
              ? "Crea el primero con el botón “Nuevo producto”."
              : "Ningún producto coincide con la búsqueda o los filtros."
          }
        />
      ) : (
        <>
          <DesktopTable products={visible} />
          <MobileCards products={visible} />
        </>
      )}

      <Fab
        color="primary"
        variant="extended"
        component={Link}
        href="/productos/nuevo"
        sx={{ display: { md: "none" }, position: "fixed", right: 16, bottom: 80 }}
      >
        <AddOutlined sx={{ mr: 0.5 }} />
        Nuevo
      </Fab>
    </Stack>
  );
}

interface ProductFiltersBarProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly status: ProductStatusFilter;
  readonly onStatusChange: (status: ProductStatusFilter) => void;
  readonly categoryId: string | null;
  readonly onCategoryChange: (categoryId: string | null) => void;
  readonly categories: readonly CategoryOption[];
}

/** Buscador, selector de categoría y pastillas de estado. */
function ProductFiltersBar(props: ProductFiltersBarProps): React.JSX.Element {
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        <SearchField
          value={props.query}
          onChange={props.onQueryChange}
          placeholder="Buscar por nombre, marca, código o tono"
        />
        <TextField
          select
          size="small"
          label="Categoría"
          value={props.categoryId ?? ""}
          onChange={(event) => props.onCategoryChange(event.target.value || null)}
          sx={{ minWidth: 200, bgcolor: "background.paper" }}
        >
          <MenuItem value="">Todas</MenuItem>
          {props.categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            onClick={() => props.onStatusChange(filter.value)}
            color={props.status === filter.value ? "primary" : "default"}
            variant={props.status === filter.value ? "filled" : "outlined"}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>
    </>
  );
}

function DesktopTable({ products }: { readonly products: readonly ProductItem[] }): React.JSX.Element {
  const router = useRouter();
  return (
    <Card sx={{ display: { xs: "none", md: "block" } }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 72 }}>Foto</TableCell>
            <TableCell>Producto</TableCell>
            <TableCell>Categoría</TableCell>
            <TableCell>Variantes</TableCell>
            <TableCell align="right">Precio</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              hover
              onClick={() => router.push(`/productos/${product.id}`)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell>
                <ProductThumb url={product.thumbnailUrl} alt={product.name} />
              </TableCell>
              <TableCell>
                <Typography variant="overline" component="div" sx={{ lineHeight: 1.4 }}>
                  {product.brandName}
                </Typography>
                <Link href={`/productos/${product.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <Typography sx={{ fontWeight: 600 }}>{product.name}</Typography>
                </Link>
              </TableCell>
              <TableCell sx={{ color: "text.secondary" }}>{product.categoryName}</TableCell>
              <TableCell>{variantsLabel(product.variantCount)}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {priceFrom(product)}
              </TableCell>
              <TableCell>
                <ProductStatus {...product} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function MobileCards({ products }: { readonly products: readonly ProductItem[] }): React.JSX.Element {
  return (
    <Stack spacing={1.5} useFlexGap sx={{ display: { md: "none" } }}>
      {products.map((product) => (
        <Card key={product.id}>
          <CardActionArea
            component={Link}
            href={`/productos/${product.id}`}
            sx={{ px: 2, py: 1.5, display: "flex", gap: 1.5, alignItems: "flex-start", justifyContent: "flex-start" }}
          >
            <ProductThumb url={product.thumbnailUrl} alt={product.name} size={64} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" component="div" sx={{ lineHeight: 1.4 }}>
                {product.brandName}
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{product.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {variantsLabel(product.variantCount)} · {priceFrom(product)}
              </Typography>
              <ProductStatus {...product} />
            </Box>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}
