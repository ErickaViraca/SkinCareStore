import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
}

/** Aviso para una sección sin datos todavía. */
export function EmptyState({ title, description }: EmptyStateProps): React.JSX.Element {
  return (
    <Card>
      <CardContent sx={{ textAlign: "center", py: 5 }}>
        <Typography variant="h2">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
