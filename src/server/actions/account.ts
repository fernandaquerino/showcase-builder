"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  liveThemeConfigSchema,
  type LiveThemeConfigInput,
} from "@/lib/validations/live-theme";
import type { ActionResult } from "@/server/actions/action-result";
import { revalidatePublicShowcase } from "@/server/cache/showcase";
import { updateUserThemeConfig } from "@/server/db/queries/users";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente.";

export async function updateAccountAppearanceAction(
  input: LiveThemeConfigInput | null,
): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsed =
    input === null
      ? { success: true as const, data: null }
      : liveThemeConfigSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise as opções de aparência.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await updateUserThemeConfig(userId, parsed.data);

    if (!user) {
      return { success: false, message: "Não encontramos sua conta." };
    }

    revalidatePath("/admin/appearance");
    revalidatePublicShowcase({ handle: user.handle });

    return { success: true };
  } catch (error) {
    console.error("Update account appearance failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      message: "Não foi possível salvar a aparência. Tente novamente.",
    };
  }
}
