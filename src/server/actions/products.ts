"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  productIdSchema,
  productInputSchema,
  reorderProductsSchema,
  type ProductFormValues,
} from "@/lib/validations/product";
import { liveIdSchema } from "@/lib/validations/live";
import type { ActionResult } from "@/server/actions/action-result";
import {
  createProduct,
  deleteProduct,
  getProductsByLiveIdForUser,
  reorderProducts,
  updateProduct,
} from "@/server/db/queries/products";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente.";
const NOT_FOUND = "Não encontramos esse produto.";
const LIVE_NOT_FOUND = "Não encontramos essa live.";
const GENERIC_SAVE_ERROR =
  "Não foi possível salvar o produto. Tente novamente.";
const REORDER_ERROR =
  "Não foi possível salvar a nova ordem. A ordem anterior foi restaurada.";

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function revalidateLive(liveId: string): void {
  revalidatePath(`/admin/lives/${liveId}`);
  // Public page revalidation (`/[handle]/[slug]`) lands with Phase 5.
}

function logFailure(message: string, error: unknown): void {
  console.error(message, {
    cause: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function createProductAction(
  liveId: string,
  input: ProductFormValues,
): Promise<ActionResult<{ liveId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  if (!parsedLiveId.success) {
    return { success: false, message: LIVE_NOT_FOUND };
  }

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const product = await createProduct(parsedLiveId.data, userId, parsed.data);
    if (!product) {
      return { success: false, message: LIVE_NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    return { success: true, data: { liveId: parsedLiveId.data } };
  } catch (error) {
    logFailure("Create product failed.", error);
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export async function updateProductAction(
  liveId: string,
  productId: string,
  input: ProductFormValues,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedLiveId.success || !parsedProductId.success) {
    return { success: false, message: NOT_FOUND };
  }

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const product = await updateProduct(
      parsedProductId.data,
      parsedLiveId.data,
      userId,
      parsed.data,
    );
    if (!product) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Update product failed.", error);
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export async function deleteProductAction(
  liveId: string,
  productId: string,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedLiveId.success || !parsedProductId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const deleted = await deleteProduct(
      parsedProductId.data,
      parsedLiveId.data,
      userId,
    );
    if (!deleted) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Delete product failed.", error);
    return {
      success: false,
      message: "Não foi possível excluir o produto. Tente novamente.",
    };
  }
}

export async function reorderProductsAction(
  liveId: string,
  orderedProductIds: string[],
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  if (!parsedLiveId.success) {
    return { success: false, message: LIVE_NOT_FOUND };
  }

  const parsed = reorderProductsSchema.safeParse({ orderedProductIds });
  if (!parsed.success) {
    return { success: false, message: REORDER_ERROR };
  }

  try {
    const result = await reorderProducts(
      parsedLiveId.data,
      userId,
      parsed.data.orderedProductIds,
    );
    if (!result.ok) {
      return { success: false, message: REORDER_ERROR };
    }

    revalidateLive(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Reorder products failed.", error);
    return { success: false, message: REORDER_ERROR };
  }
}

/**
 * Moves a product one step up or down. The new order is computed on the server
 * from the live's current order, then persisted through the validated reorder
 * path, so a manipulated client payload cannot shuffle products arbitrarily.
 */
async function moveProduct(
  liveId: string,
  productId: string,
  direction: -1 | 1,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedLiveId.success || !parsedProductId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const current = await getProductsByLiveIdForUser(parsedLiveId.data, userId);
    const index = current.findIndex((p) => p.id === parsedProductId.data);
    if (index === -1) {
      return { success: false, message: NOT_FOUND };
    }

    const target = index + direction;
    if (target < 0 || target >= current.length) {
      return { success: true };
    }

    const ordered = current.map((p) => p.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    const result = await reorderProducts(parsedLiveId.data, userId, ordered);
    if (!result.ok) {
      return { success: false, message: REORDER_ERROR };
    }

    revalidateLive(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Move product failed.", error);
    return { success: false, message: REORDER_ERROR };
  }
}

export async function moveProductUpAction(
  liveId: string,
  productId: string,
): Promise<ActionResult> {
  return moveProduct(liveId, productId, -1);
}

export async function moveProductDownAction(
  liveId: string,
  productId: string,
): Promise<ActionResult> {
  return moveProduct(liveId, productId, 1);
}
