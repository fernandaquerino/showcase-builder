"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import type { ActionResult } from "@/server/actions/action-result";

function safeRedirectTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}

export async function loginAction(
  input: LoginInput,
  callbackUrl?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirectTo(callbackUrl),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        message: "E-mail ou senha inválidos.",
      };
    }

    throw error;
  }
}
