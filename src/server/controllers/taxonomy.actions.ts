"use server";

import { refresh } from "next/cache";

import { parseOrThrow } from "@/server/dto/validation";
import {
  brandInputSchema,
  categoryInputSchema,
  idSchema,
  updateBrandSchema,
  updateCategorySchema,
} from "@/server/dto/taxonomy.dto";
import { createLogger } from "@/server/logger/logger";
import * as brandsService from "@/server/services/brands.service";
import * as categoriesService from "@/server/services/categories.service";

import { type ActionResult, runAction } from "./action-result";
import { requireAdminSession } from "./session.controller";

/**
 * Acciones de "Marcas y categorías". Cada una: verifica la sesión → valida la
 * entrada → llama a un servicio → refresca la pantalla (guía de backend §3).
 * Devuelven solo `null`: la lista se vuelve a leer en el servidor con `refresh()`.
 */

const logger = createLogger("controller:taxonomy");

/**
 * Pasos comunes de toda acción de esta pantalla.
 * Patrón: **Plantilla** (template method) sobre `runAction`.
 */
function runMutation(name: string, operation: () => Promise<unknown>): Promise<ActionResult<null>> {
  return runAction(logger, name, async () => {
    await requireAdminSession();
    await operation();
    refresh();
    return null;
  });
}

export async function createBrandAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("createBrand", () => brandsService.createBrand(parseOrThrow(brandInputSchema, input)));
}

export async function updateBrandAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("updateBrand", () => {
    const { id, ...data } = parseOrThrow(updateBrandSchema, input);
    return brandsService.renameBrand(id, data);
  });
}

export async function archiveBrandAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("archiveBrand", () => brandsService.archiveBrand(parseOrThrow(idSchema, id)));
}

export async function restoreBrandAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("restoreBrand", () => brandsService.restoreBrand(parseOrThrow(idSchema, id)));
}

export async function createCategoryAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("createCategory", () =>
    categoriesService.createCategory(parseOrThrow(categoryInputSchema, input)),
  );
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult<null>> {
  return runMutation("updateCategory", () => {
    const { id, ...data } = parseOrThrow(updateCategorySchema, input);
    return categoriesService.updateCategory(id, data);
  });
}

export async function archiveCategoryAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("archiveCategory", () => categoriesService.archiveCategory(parseOrThrow(idSchema, id)));
}

export async function restoreCategoryAction(id: unknown): Promise<ActionResult<null>> {
  return runMutation("restoreCategory", () => categoriesService.restoreCategory(parseOrThrow(idSchema, id)));
}
