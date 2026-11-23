import "server-only";

import { AwsClient } from "aws4fetch";

/**
 * Almacenamiento de las fotos de productos en Cloudflare R2 (compatible con S3).
 *
 * Patrón: **Adaptador** detrás de una interfaz chica (`PhotoStorage`): los
 * servicios no saben que es R2, y en los tests se reemplaza por uno falso.
 * Junto con `src/db`, es el único lugar que lee credenciales (guía de backend §5.8).
 *
 * Las fotos se suben **directo del navegador a R2** con un enlace firmado de
 * pocos minutos: no pasan por Vercel (que limita el tamaño de lo que recibe).
 */

/** Datos de un archivo ya subido, para comprobarlo antes de registrarlo. */
interface StoredObject {
  readonly size: number;
  readonly contentType: string | null;
}

export interface PhotoStorage {
  /** Enlace firmado para subir un archivo con ese tipo (PUT desde el navegador). */
  createUploadUrl(key: string, contentType: string): Promise<string>;
  /** Datos del archivo, o `null` si no existe. */
  describe(key: string): Promise<StoredObject | null>;
  /** Borra el archivo (si no existe, no hace nada). */
  remove(key: string): Promise<void>;
  /** Dirección pública de la foto. */
  publicUrl(key: string): string;
}

/** Minutos que dura un enlace de subida. */
const UPLOAD_URL_SECONDS = 5 * 60;

interface R2Config {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  readonly publicUrl: string;
}

/** Implementación sobre R2 con firmas AWS v4 (aws4fetch, sin dependencias). */
export class R2PhotoStorage implements PhotoStorage {
  private readonly client: AwsClient;
  private readonly config: R2Config;
  private readonly fetcher: typeof fetch;

  constructor(config: R2Config, fetcher: typeof fetch = fetch) {
    this.config = config;
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: "auto",
    });
    this.fetcher = fetcher;
  }

  private objectUrl(key: string): string {
    const path = key.split("/").map(encodeURIComponent).join("/");
    return `https://${this.config.accountId}.r2.cloudflarestorage.com/${this.config.bucket}/${path}`;
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    const url = new URL(this.objectUrl(key));
    url.searchParams.set("X-Amz-Expires", String(UPLOAD_URL_SECONDS));
    const signed = await this.client.sign(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": contentType },
      // allHeaders: el tipo de archivo queda firmado; R2 rechaza una subida con otro tipo.
      aws: { signQuery: true, allHeaders: true },
    });
    return signed.url;
  }

  async describe(key: string): Promise<StoredObject | null> {
    const response = await this.send(key, "HEAD");
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`R2 respondió ${response.status} al consultar un archivo.`);
    return {
      size: Number(response.headers.get("content-length") ?? "0"),
      contentType: response.headers.get("content-type"),
    };
  }

  async remove(key: string): Promise<void> {
    const response = await this.send(key, "DELETE");
    if (!response.ok && response.status !== 404) {
      throw new Error(`R2 respondió ${response.status} al borrar un archivo.`);
    }
  }

  publicUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }

  private async send(key: string, method: "HEAD" | "DELETE"): Promise<Response> {
    const signed = await this.client.sign(this.objectUrl(key), { method });
    return this.fetcher(signed);
  }
}

let instance: PhotoStorage | null | undefined;

/**
 * Almacenamiento configurado con las variables R2_*, o `null` si faltan
 * (el panel sigue funcionando y la sección de fotos lo avisa).
 */
export function getPhotoStorage(): PhotoStorage | null {
  if (instance !== undefined) return instance;
  const env = process.env;
  const config = {
    accountId: env.R2_ACCOUNT_ID ?? "",
    accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: env.R2_PHOTOS_BUCKET ?? "",
    publicUrl: withoutTrailingSlash(env.R2_PUBLIC_URL ?? ""),
  };
  instance = Object.values(config).every((value) => value !== "") ? new R2PhotoStorage(config) : null;
  return instance;
}

function withoutTrailingSlash(url: string): string {
  let result = url.trim();
  while (result.endsWith("/")) result = result.slice(0, -1);
  return result;
}
