"use client";

import AddPhotoAlternateOutlined from "@mui/icons-material/AddPhotoAlternateOutlined";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormCard } from "@/components/ui/form-card";
import { StatusChip } from "@/components/ui/status-chip";
import { type ToastMessage } from "@/components/ui/toast";
import { type Mutation, type MutationResult, type MutationResultWith } from "@/lib/action-state";

import { ACCEPTED_PHOTO_TYPES } from "./prepare-photo";
import { uploadPhotos } from "./upload-photos";

/** Máximo de fotos por producto (decisión de la etapa 3d; el servidor también lo controla). */
const MAX_PHOTOS = 10;

interface PhotoItem {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
  readonly variantId: string | null;
}

interface VariantOption {
  readonly id: string;
  readonly label: string;
}

export interface PhotoActions {
  readonly prepare: (input: unknown) => Promise<MutationResultWith<{ uploadUrl: string; key: string }>>;
  readonly register: Mutation;
  readonly move: Mutation;
  readonly assign: Mutation;
  readonly remove: Mutation;
}

interface PhotosSectionProps {
  readonly productId: string;
  readonly photos: readonly PhotoItem[];
  readonly variants: readonly VariantOption[];
  readonly enabled: boolean;
  readonly archived: boolean;
  readonly actions: PhotoActions;
  readonly notify: (text: string, severity?: ToastMessage["severity"]) => void;
}

/**
 * Fotos del producto (etapa 3d): subir (se achican en el navegador), ordenar
 * con flechas, asignar a un tono y borrar. La primera es la principal.
 */
export function PhotosSection(props: PhotosSectionProps): React.JSX.Element {
  const { progress, upload } = usePhotoUpload(props);
  const [deleting, setDeleting] = useState<PhotoItem | null>(null);
  const [, startTransition] = useTransition();
  const room = MAX_PHOTOS - props.photos.length;
  const canEdit = props.enabled && !props.archived;

  /** Mover o asignar: si el servidor rechaza, se avisa. */
  const run = (action: Promise<MutationResult>): void =>
    startTransition(async () => {
      const result = await action;
      if (!result.ok) props.notify(result.error.message, "error");
    });

  return (
    <FormCard
      title="Fotos"
      subtitle={`La primera es la principal. Hasta ${MAX_PHOTOS} fotos; se achican solas al subirlas.`}
    >
      <PhotoNotices enabled={props.enabled} progress={progress} full={canEdit && room <= 0} />
      <Box sx={GRID}>
        {props.photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isMain={index === 0}
            canMoveEarlier={index > 0}
            canMoveLater={index < props.photos.length - 1}
            canEdit={canEdit}
            variants={props.variants}
            onMove={(direction) => run(props.actions.move({ id: photo.id, direction }))}
            onAssign={(variantId) => run(props.actions.assign({ id: photo.id, variantId }))}
            onDelete={() => setDeleting(photo)}
          />
        ))}
        {canEdit && room > 0 && <AddPhotoTile disabled={progress !== null} onFiles={upload} />}
      </Box>
      {deleting && (
        <ConfirmDialog
          open
          title="¿Borrar esta foto?"
          message="Se borra del panel y de la página pública. Esta acción no se puede deshacer."
          confirmLabel="Borrar"
          onConfirm={() => props.actions.remove(deleting.id)}
          onSuccess={() => {
            setDeleting(null);
            props.notify("Foto borrada.");
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </FormCard>
  );
}

/** Subida de fotos con su mensaje de progreso. Patrón: **Custom hook**. */
function usePhotoUpload(props: PhotosSectionProps): { progress: string | null; upload: (files: File[]) => void } {
  const [progress, setProgress] = useState<string | null>(null);
  const upload = (files: File[]): void => {
    const room = MAX_PHOTOS - props.photos.length;
    void uploadPhotos({
      productId: props.productId,
      files,
      room,
      actions: props.actions,
      onProgress: setProgress,
    }).then((summary) => {
      setProgress(null);
      if (summary.uploaded > 0) {
        props.notify(summary.uploaded === 1 ? "Foto agregada." : `${summary.uploaded} fotos agregadas.`);
      }
      if (summary.problem) props.notify(summary.problem, "error");
    });
  };
  return { progress, upload };
}

const GRID = {
  display: "grid",
  gap: 1.5,
  gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
} as const;

interface PhotoNoticesProps {
  readonly enabled: boolean;
  readonly progress: string | null;
  readonly full: boolean;
}

/** Avisos: fotos sin configurar, subida en curso o límite alcanzado. */
function PhotoNotices({ enabled, progress, full }: PhotoNoticesProps): React.JSX.Element {
  const message =
    (!enabled && "Las fotos todavía no están configuradas: faltan las variables de Cloudflare R2 en Vercel.") ||
    progress ||
    (full && `Llegaste al máximo de ${MAX_PHOTOS} fotos. Borra alguna para subir otra.`);
  return message ? (
    <Alert severity="info" sx={{ mb: 2 }}>
      {message}
    </Alert>
  ) : (
    <></>
  );
}

interface PhotoCardProps {
  readonly photo: PhotoItem;
  readonly isMain: boolean;
  readonly canMoveEarlier: boolean;
  readonly canMoveLater: boolean;
  readonly canEdit: boolean;
  readonly variants: readonly VariantOption[];
  readonly onMove: (direction: "earlier" | "later") => void;
  readonly onAssign: (variantId: string) => void;
  readonly onDelete: () => void;
}

function PhotoCard(props: PhotoCardProps): React.JSX.Element {
  return (
    <Box
      sx={{ border: 1, borderColor: "divider", borderRadius: "14px", overflow: "hidden", bgcolor: "background.paper" }}
    >
      <Box sx={{ position: "relative", aspectRatio: "1 / 1" }}>
        <Box
          component="img"
          src={props.photo.url}
          alt={props.photo.alt ?? ""}
          loading="lazy"
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {props.isMain && (
          <Box sx={{ position: "absolute", top: 8, left: 8 }}>
            <StatusChip label="Principal" tone="highlight" />
          </Box>
        )}
      </Box>
      {props.canEdit && <PhotoControls {...props} />}
    </Box>
  );
}

/** Tono de la foto y botones de mover y borrar. */
function PhotoControls(props: PhotoCardProps): React.JSX.Element {
  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
      {props.variants.length > 1 && (
        <TextField
          select
          size="small"
          label="Para"
          value={props.photo.variantId ?? ""}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          onChange={(event) => props.onAssign(event.target.value)}
        >
          <MenuItem value="">Todo el producto</MenuItem>
          {props.variants.map((variant) => (
            <MenuItem key={variant.id} value={variant.id}>
              {variant.label}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <IconTip label="Mover antes" disabled={!props.canMoveEarlier} onClick={() => props.onMove("earlier")}>
          <ChevronLeft />
        </IconTip>
        <IconTip label="Borrar foto" color="error" onClick={props.onDelete}>
          <DeleteOutlined />
        </IconTip>
        <IconTip label="Mover después" disabled={!props.canMoveLater} onClick={() => props.onMove("later")}>
          <ChevronRight />
        </IconTip>
      </Box>
    </Box>
  );
}

interface IconTipProps {
  readonly label: string;
  readonly disabled?: boolean;
  readonly color?: "error";
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

/** Botón de ícono con su texto de ayuda (y `aria-label` para lectores de pantalla). */
function IconTip({ label, disabled = false, color, onClick, children }: IconTipProps): React.JSX.Element {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton aria-label={label} disabled={disabled} color={color} onClick={onClick}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

interface AddPhotoTileProps {
  readonly disabled: boolean;
  readonly onFiles: (files: File[]) => void;
}

/** Recuadro "+" para agregar fotos (en el celular abre la galería o la cámara). */
function AddPhotoTile({ disabled, onFiles }: AddPhotoTileProps): React.JSX.Element {
  return (
    <Button
      component="label"
      variant="outlined"
      color="secondary"
      disabled={disabled}
      sx={{
        aspectRatio: "1 / 1",
        borderStyle: "dashed",
        borderWidth: 2,
        borderColor: "accent.main",
        borderRadius: "14px",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <AddPhotoAlternateOutlined />
      Agregar fotos
      <input
        hidden
        type="file"
        multiple
        accept={ACCEPTED_PHOTO_TYPES.join(",")}
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </Button>
  );
}
