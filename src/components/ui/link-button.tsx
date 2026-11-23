"use client";

import Button from "@mui/material/Button";
import { type SxProps, type Theme } from "@mui/material/styles";
import Link from "next/link";

interface LinkButtonProps {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly startIcon?: React.ReactNode;
  readonly sx?: SxProps<Theme>;
}

/** Botón principal que lleva a otra página (por ejemplo, "Nuevo producto"). */
export function LinkButton({ href, children, startIcon, sx }: LinkButtonProps): React.JSX.Element {
  return (
    <Button component={Link} href={href} variant="contained" startIcon={startIcon} sx={sx}>
      {children}
    </Button>
  );
}
