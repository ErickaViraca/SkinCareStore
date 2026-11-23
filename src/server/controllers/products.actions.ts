"use server";

import { refresh } from "next/cache";

import {
  addVariantSchema,
  createProductSchema,
  updateProductSchema,
  updateVariantSchema,
} from "@/server/dto/products.dto";
import { idSchema } from "@/server/dto/taxonomy.dto";
import { parseOrThrow } from "@/server/dto/validation";
import { createLogger } from "@/server/logger/logger";
import * as productsService from "@/server/services/products.service";

import { type ActionResult, runAction } from "./action-result";
import { requireAdminSession } from "./session.controller";

/**
 * Acciones de productos y variantes. Cada una: verifica la sesión → valida la
 * entrada → llama a un servicio → refresca la pantalla (guía de backend §3).
 */

const logger = createLogger("controller:products");

function runMutation<T>(name: string, operation: () => Promise<T>): Promise<ActionResult<T>> {
  return runAction(logger, name, async () => {
    await requireAdminSession();
    const result = await operation();
    refresh();
    return result;
  });
}

/** Crea el producto con su primera variante. Devuelve el id para abrir su ficha. */
export async function createProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runMutation("createProduct", async () => {
    const product = await productsService.createProduct(parseOrThrow(createProductSchema, input));
    return { id: product.id };
  });
}

export async function updateProductAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("updateProduct", async () => {
    const { id, ...data } = parseOrThrow(updateProductSchema, input);
    await productsService.updateProduct(id, data);
    return null;
  });
}

export async function archiveProductAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("archiveProduct", async () => {
    await productsService.archiveProduct(parseOrThrow(idSchema, id));
    return null;
  });
}

export async function restoreProductAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("restoreProduct", async () => {
    await productsService.restoreProduct(parseOrThrow(idSchema, id));
    return null;
  });
}

export async function addVariantAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("addVariant", async () => {
    const { productId, variant } = parseOrThrow(addVariantSchema, input);
    await productsService.addVariant(productId, variant);
    return null;
  });
}

export async function updateVariantAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("updateVariant", async () => {
    const { id, variant } = parseOrThrow(updateVariantSchema, input);
    await productsService.updateVariant(id, variant);
    return null;
  });
}

export async function archiveVariantAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("archiveVariant", async () => {
    await productsService.archiveVariant(parseOrThrow(idSchema, id));
    return null;
  });
}

export async function restoreVariantAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("restoreVariant", async () => {
    await productsService.restoreVariant(parseOrThrow(idSchema, id));
    return null;
  });
}
