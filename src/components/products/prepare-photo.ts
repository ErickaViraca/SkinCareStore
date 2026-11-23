"use client";

import { fitWithin } from "@/lib/image-size";

/**
 * Prepara una foto en el navegador antes de subirla: la achica a 1600 px como
 * máximo y la convierte a WebP (o JPEG si el navegador no puede). Así pesa
 * ~200–400 KB y la página pública carga rápido.
 */

/** Tipos que se aceptan al elegir el archivo. */
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Tamaño máximo del archivo original. */
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 1600;
const QUALITY = 0.82;

/** Mensaje si el archivo no sirve; `null` si se puede subir. */
export function photoFileProblem(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) return "Solo se aceptan fotos JPG, PNG o WebP.";
  if (file.size > MAX_ORIGINAL_BYTES) return "La foto pesa más de 15 MB.";
  return null;
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no pudo procesar la foto.");
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const webp = await toBlob(canvas, "image/webp");
  // Algunos navegadores no generan WebP y devuelven PNG: en ese caso, JPEG (más liviano).
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg");
  if (!jpeg) throw new Error("El navegador no pudo procesar la foto.");
  return jpeg;
}
