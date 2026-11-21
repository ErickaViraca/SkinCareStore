import Chip from "@mui/material/Chip";

interface StatusChipProps {
  readonly label: string;
}

/**
 * Etiqueta de estado "Borrador / archivado" (docs/UI.md §3): fondo gris
 * cálido y texto gris. Los demás estados se agregan cuando una pantalla los use.
 */
export function StatusChip({ label }: StatusChipProps): React.JSX.Element {
  return (
    <Chip label={label} size="small" sx={{ bgcolor: "action.selected", color: "text.secondary", fontWeight: 600 }} />
  );
}
