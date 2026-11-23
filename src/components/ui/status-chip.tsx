import Chip from "@mui/material/Chip";

/**
 * Tonos de las etiquetas de estado (docs/UI.md §3):
 * - `published`: fondo verde oscuro, letras blancas ("Publicado").
 * - `highlight`: fondo del color principal, letras verde oscuro ("Oferta", "Disponible pronto").
 * - `muted`: fondo gris cálido, letras grises ("Borrador", "Archivado").
 */
type StatusTone = "published" | "highlight" | "muted";

interface StatusChipProps {
  readonly label: string;
  readonly tone?: StatusTone;
}

const TONES: Record<StatusTone, { bgcolor: string; color: string }> = {
  published: { bgcolor: "nav.main", color: "nav.contrastText" },
  highlight: { bgcolor: "primary.main", color: "primary.contrastText" },
  muted: { bgcolor: "action.selected", color: "text.secondary" },
};

export function StatusChip({ label, tone = "muted" }: StatusChipProps): React.JSX.Element {
  return <Chip label={label} size="small" sx={{ ...TONES[tone], fontWeight: 600 }} />;
}
