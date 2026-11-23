"use client";

import { type Mutation, type MutationResultWith } from "@/lib/action-state";

import { photoFileProblem, preparePhoto } from "./prepare-photo";

interface UploadActions {
  readonly prepare: (input: unknown) => Promise<MutationResultWith<{ uploadUrl: string; key: string }>>;
  readonly register: Mutation;
}

interface UploadRequest {
  readonly productId: string;
  readonly files: readonly File[];
  /** Cuántas fotos más se pueden agregar (máximo 10 por producto). */
  readonly room: number;
  readonly actions: UploadActions;
  readonly onProgress: (message: string) => void;
}

export interface UploadSummary {
  readonly uploaded: number;
  /** Primer problema encontrado (se muestra como aviso), o `null`. */
  readonly problem: string | null;
}

/**
 * Sube fotos de una en una: achica → pide el enlace firmado → sube directo a
 * R2 → la registra. Si una falla, sigue con las demás y avisa al final.
 */
export async function uploadPhotos(request: UploadRequest): Promise<UploadSummary> {
  const files = request.files.slice(0, Math.max(0, request.room));
  let problem: string | null =
    request.files.length > files.length
      ? `Solo se subieron ${files.length}: el máximo es 10 fotos por producto.`
      : null;
  let uploaded = 0;

  for (const [index, file] of files.entries()) {
    request.onProgress(`Subiendo ${index + 1} de ${files.length}…`);
    const error = await uploadOne(request.productId, file, request.actions);
    if (error) problem ??= `${file.name}: ${error}`;
    else uploaded += 1;
  }
  return { uploaded, problem };
}

/** Sube una foto. Devuelve el mensaje de error, o `null` si salió bien. */
async function uploadOne(productId: string, file: File, actions: UploadActions): Promise<string | null> {
  const fileProblem = photoFileProblem(file);
  if (fileProblem) return fileProblem;
  try {
    const photo = await preparePhoto(file);
    const prepared = await actions.prepare({ productId, contentType: photo.type });
    if (!prepared.ok) return prepared.error.message;
    const response = await fetch(prepared.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": photo.type },
      body: photo,
    });
    if (!response.ok) return "No se pudo subir la foto. Revisa la conexión e intenta de nuevo.";
    const registered = await actions.register({ productId, key: prepared.data.key });
    return registered.ok ? null : registered.error.message;
  } catch {
    return "No se pudo procesar la foto. Intenta con otra.";
  }
}
