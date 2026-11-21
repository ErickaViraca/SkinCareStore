import "server-only";

import { type Database, getDb } from "@/db/client";
import { type ParentProblem, findParentProblem } from "@/domain/category-hierarchy";
import { slugify } from "@/domain/slug";
import { type CategoryInput } from "@/server/dto/taxonomy.dto";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/server/errors/app-error";
import { createLogger } from "@/server/logger/logger";
import {
  type CategoryListRow,
  type CategoryRow,
  countSubcategories,
  findCategoryById,
  insertCategory,
  listCategoriesWithProductCount,
  setCategoryArchivedAt,
  updateCategory as updateCategoryRow,
} from "@/server/repositories/categories.repository";

/**
 * Casos de uso de categorías (§3.2 y etapa 3b): un solo nivel de
 * subcategorías ("Rostro → Serums"). Nada se borra: se archiva.
 */

const logger = createLogger("service:categories");

/** Mensaje para la usuaria por cada problema con la categoría padre. */
const PARENT_PROBLEM_MESSAGES: Record<ParentProblem, string> = {
  self: "Una categoría no puede estar dentro de sí misma.",
  "parent-archived": "La categoría elegida está archivada.",
  "parent-is-subcategory": "Solo se puede elegir una categoría principal (sin padre).",
  "has-subcategories": "Esta categoría tiene subcategorías: no puede ir dentro de otra.",
};

const notFound = (): NotFoundError => new NotFoundError("La categoría no existe.");

function nameAndSlug(name: string): { name: string; slug: string } {
  const slug = slugify(name);
  if (slug === "") throw new ValidationError("Revisa el nombre.", { name: "Usa al menos una letra o un número." });
  return { name, slug };
}

/** Comprueba que `parentId` pueda ser el padre de la categoría `categoryId` (`null` si es nueva). */
async function assertValidParent(db: Database, categoryId: string | null, parentId: string): Promise<void> {
  const parent = await findCategoryById(db, parentId);
  if (!parent) throw new ValidationError("Revisa la categoría padre.", { parentId: "La categoría no existe." });
  const hasSubcategories = categoryId !== null && (await countSubcategories(db, categoryId, false)) > 0;
  const problem = findParentProblem(
    categoryId,
    { id: parent.id, parentId: parent.parentId, archived: parent.archivedAt !== null },
    hasSubcategories,
  );
  if (problem) {
    logger.warn("Categoría padre rechazada", { categoryId, parentId, problem });
    throw new ValidationError("Revisa la categoría padre.", { parentId: PARENT_PROBLEM_MESSAGES[problem] });
  }
}

export function listCategories(db: Database = getDb()): Promise<CategoryListRow[]> {
  return listCategoriesWithProductCount(db);
}

export async function createCategory(input: CategoryInput, db: Database = getDb()): Promise<CategoryRow> {
  const values = nameAndSlug(input.name);
  if (input.parentId) await assertValidParent(db, null, input.parentId);
  const category = await insertCategory(db, { ...values, parentId: input.parentId });
  logger.info("Categoría creada", { categoryId: category.id });
  return category;
}

export async function updateCategory(id: string, input: CategoryInput, db: Database = getDb()): Promise<CategoryRow> {
  const values = nameAndSlug(input.name);
  const current = await findCategoryById(db, id);
  if (!current) throw notFound();
  // Solo se revisa el padre si cambió: editar el nombre no debe fallar por el estado del padre actual.
  if (input.parentId && input.parentId !== current.parentId) await assertValidParent(db, id, input.parentId);
  const category = await updateCategoryRow(db, id, { ...values, parentId: input.parentId });
  if (!category) throw notFound();
  logger.info("Categoría actualizada", { categoryId: id });
  return category;
}

/** Archiva una categoría. Si tiene subcategorías activas, primero hay que archivar esas. */
export async function archiveCategory(id: string, db: Database = getDb()): Promise<CategoryRow> {
  if (!(await findCategoryById(db, id))) throw notFound();
  if ((await countSubcategories(db, id, true)) > 0) {
    throw new BusinessRuleError("Primero archiva sus subcategorías (o muévelas a otra categoría).");
  }
  const category = await setCategoryArchivedAt(db, id, new Date());
  if (!category) throw notFound();
  logger.info("Categoría archivada", { categoryId: id });
  return category;
}

/** Reactiva una categoría. Una subcategoría solo se reactiva si su padre está activo. */
export async function restoreCategory(id: string, db: Database = getDb()): Promise<CategoryRow> {
  const current = await findCategoryById(db, id);
  if (!current) throw notFound();
  if (current.parentId) {
    const parent = await findCategoryById(db, current.parentId);
    if (parent?.archivedAt) {
      throw new BusinessRuleError(`Primero reactiva la categoría "${parent.name}" (o mueve esta a otra).`);
    }
  }
  const category = await setCategoryArchivedAt(db, id, null);
  if (!category) throw notFound();
  logger.info("Categoría reactivada", { categoryId: id });
  return category;
}
