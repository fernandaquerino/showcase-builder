"use server";

import { hash } from "bcryptjs";

import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import type { ActionResult } from "@/server/actions/action-result";
import { db } from "@/server/db";
import { findUserByEmailOrHandle } from "@/server/db/queries/users";
import { users } from "@/server/db/schema";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "23505"
  );
}

export async function signupAction(
  input: SignupInput,
): Promise<ActionResult<{ email: string }>> {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, handle, password } = parsed.data;

  try {
    const existingUser = await findUserByEmailOrHandle(email, handle);

    if (existingUser?.email === email) {
      return {
        success: false,
        message: "Já existe uma conta com este e-mail.",
        fieldErrors: { email: ["Este e-mail já está em uso."] },
      };
    }

    if (existingUser?.handle === handle) {
      return {
        success: false,
        message: "Este handle não está disponível.",
        fieldErrors: { handle: ["Escolha outro handle."] },
      };
    }

    const passwordHash = await hash(password, 12);

    await db.insert(users).values({
      name,
      email,
      handle,
      passwordHash,
    });

    return {
      success: true,
      data: { email },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "E-mail ou handle já cadastrado.",
      };
    }

    console.error("Signup failed.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    return {
      success: false,
      message: "Não foi possível criar sua conta. Tente novamente.",
    };
  }
}
