"use server";

import { refresh } from "next/cache";

import {
  assignPhotoSchema,
  movePhotoSchema,
  prepareUploadSchema,
  registerUploadSchema,
} from "@/server/dto/products.dto";
import { idSchema } from "@/server/dto/taxonomy.dto";
import { parseOrThrow } from "@/server/dto/validation";
import { createLogger } from "@/server/logger/logger";
import * as photosService from "@/server/services/photos.service";

import { type ActionResult, runAction } from "./action-result";
import { requireAdminSession } from "./session.controller";

/**
 * Acciones de las fotos de un producto. Cada una verifica la sesión por su
 * cuenta (guía de backend §3.1), valida y llama a un servicio.
 */

const logger = createLogger("controller:photos");

function runPhotoAction<T>(name: string, operation: () => Promise<T>, refreshScreen = true): Promise<ActionResult<T>> {
  return runAction(logger, name, async () => {
    await requireAdminSession();
    const result = await operation();
    if (refreshScreen) refresh();
    return result;
  });
}

/** Paso 1 de la subida: enlace firmado (no cambia nada en la pantalla todavía). */
export async function preparePhotoUploadAction(
  input: unknown,
): Promise<ActionResult<{ uploadUrl: string; key: string }>> {
  return runPhotoAction(
    "preparePhotoUpload",
    () => {
      const { productId, contentType } = parseOrThrow(prepareUploadSchema, input);
      return photosService.prepareUpload(productId, contentType);
    },
    false,
  );
}

/** Paso 3 de la subida: registra la foto ya subida a R2. */
export async function registerPhotoAction(input: unknown): Promise<ActionResult<null>> {
  return runPhotoAction("registerPhoto", async () => {
    const { productId, key } = parseOrThrow(registerUploadSchema, input);
    await photosService.registerUpload(productId, key);
    return null;
  });
}

export async function movePhotoAction(input: unknown): Promise<ActionResult<null>> {
  return runPhotoAction("movePhoto", async () => {
    const { id, direction } = parseOrThrow(movePhotoSchema, input);
    await photosService.movePhoto(id, direction);
    return null;
  });
}

export async function assignPhotoVariantAction(input: unknown): Promise<ActionResult<null>> {
  return runPhotoAction("assignPhotoVariant", async () => {
    const { id, variantId } = parseOrThrow(assignPhotoSchema, input);
    await photosService.assignPhotoVariant(id, variantId);
    return null;
  });
}

export async function deletePhotoAction(id: unknown): Promise<ActionResult<null>> {
  return runPhotoAction("deletePhoto", async () => {
    await photosService.deletePhoto(parseOrThrow(idSchema, id));
    return null;
  });
}
