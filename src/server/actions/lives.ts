"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { appendSuffix } from "@/lib/slug";
import {
  liveIdSchema,
  liveInputSchema,
  type LiveFormValues,
} from "@/lib/validations/live";
import type { ActionResult } from "@/server/actions/action-result";
import {
  createLive,
  deleteLive,
  isLiveSlugAvailable,
  publishLive,
  unpublishLive,
  updateLive,
} from "@/server/db/queries/lives";

const MAX_SLUG_ATTEMPTS = 20;
const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente.";
const GENERIC_SAVE_ERROR = "Não foi possível salvar a live. Tente novamente.";
const NOT_FOUND = "Não encontramos essa live.";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "23505"
  );
}

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function revalidateLive(liveId: string): void {
  revalidatePath("/admin");
  revalidatePath(`/admin/lives/${liveId}`);
  // Public page revalidation (`/[handle]/[slug]`) lands with Phase 5.
}

/**
 * Finds a free slug for the user, appending a short numeric suffix when the
 * desired one is taken. Returns `null` when every attempt collides.
 */
async function resolveUniqueSlug(
  userId: string,
  desiredSlug: string,
  ignoredLiveId?: string,
): Promise<string | null> {
  if (await isLiveSlugAvailable(userId, desiredSlug, ignoredLiveId)) {
    return desiredSlug;
  }

  for (let suffix = 2; suffix <= MAX_SLUG_ATTEMPTS; suffix += 1) {
    const candidate = appendSuffix(desiredSlug, suffix);
    if (await isLiveSlugAvailable(userId, candidate, ignoredLiveId)) {
      return candidate;
    }
  }

  return null;
}

const slugTaken: ActionResult = {
  success: false,
  message: "Este endereço já está sendo usado por outra live.",
  fieldErrors: { slug: ["Escolha outro endereço para a live."] },
};

export async function createLiveAction(
  input: LiveFormValues,
): Promise<ActionResult<{ liveId: string }>> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsed = liveInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const slug = await resolveUniqueSlug(userId, parsed.data.slug);

    if (!slug) {
      return slugTaken;
    }

    const live = await createLive(userId, { ...parsed.data, slug });
    revalidateLive(live.id);

    return { success: true, data: { liveId: live.id } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return slugTaken;
    }

    console.error("Create live failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export async function updateLiveAction(
  liveId: string,
  input: LiveFormValues,
): Promise<ActionResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedId = liveIdSchema.safeParse(liveId);

  if (!parsedId.success) {
    return { success: false, message: NOT_FOUND };
  }

  const parsed = liveInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const slug = await resolveUniqueSlug(
      userId,
      parsed.data.slug,
      parsedId.data,
    );

    if (!slug) {
      return slugTaken;
    }

    const live = await updateLive(parsedId.data, userId, {
      ...parsed.data,
      slug,
    });

    if (!live) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(live.id);
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return slugTaken;
    }

    console.error("Update live failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export async function publishLiveAction(liveId: string): Promise<ActionResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedId = liveIdSchema.safeParse(liveId);

  if (!parsedId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const published = await publishLive(parsedId.data, userId);

    if (!published) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(published.id);
    return { success: true };
  } catch (error) {
    console.error("Publish live failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      message: "Não foi possível publicar a live. Tente novamente.",
    };
  }
}

export async function unpublishLiveAction(
  liveId: string,
): Promise<ActionResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedId = liveIdSchema.safeParse(liveId);

  if (!parsedId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const live = await unpublishLive(parsedId.data, userId);

    if (!live) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(live.id);
    return { success: true };
  } catch (error) {
    console.error("Unpublish live failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      message: "Não foi possível despublicar a live. Tente novamente.",
    };
  }
}

export async function deleteLiveAction(liveId: string): Promise<ActionResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedId = liveIdSchema.safeParse(liveId);

  if (!parsedId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const live = await deleteLive(parsedId.data, userId);

    if (!live) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(live.id);
    return { success: true };
  } catch (error) {
    console.error("Delete live failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      message: "Não foi possível excluir a live. Tente novamente.",
    };
  }
}
