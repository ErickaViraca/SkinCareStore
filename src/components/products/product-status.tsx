import Stack from "@mui/material/Stack";

import { StatusChip } from "@/components/ui/status-chip";

interface ProductStatusProps {
  readonly published: boolean;
  readonly comingSoon: boolean;
  readonly archived: boolean;
}

/** Etiquetas de estado de un producto: Publicado / Borrador / Archivado y "Disponible pronto". */
export function ProductStatus({ published, comingSoon, archived }: ProductStatusProps): React.JSX.Element {
  if (archived) return <StatusChip label="Archivado" />;
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
      {published ? <StatusChip label="Publicado" tone="published" /> : <StatusChip label="Borrador" />}
      {comingSoon && <StatusChip label="Disponible pronto" tone="highlight" />}
    </Stack>
  );
}
