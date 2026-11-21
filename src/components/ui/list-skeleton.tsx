"use client";

import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

/** Carga de una lista: barras grises con la forma de las filas. */
export function ListSkeleton({ rows = 5 }: { readonly rows?: number }): React.JSX.Element {
  return (
    <Stack spacing={1.5} role="status" aria-label="Cargando">
      <Skeleton variant="rounded" height={40} />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={56} />
      ))}
    </Stack>
  );
}
