import "server-only";

import { eq, or } from "drizzle-orm";

import type { LiveThemeConfig } from "@/lib/live-theme";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function findUserByEmailOrHandle(email: string, handle: string) {
  return db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.handle, handle)),
  });
}

export async function getUserThemeConfig(
  userId: string,
): Promise<LiveThemeConfig | null | undefined> {
  const user = await db.query.users.findFirst({
    columns: { themeConfig: true },
    where: eq(users.id, userId),
  });

  return user?.themeConfig;
}

export async function updateUserThemeConfig(
  userId: string,
  themeConfig: LiveThemeConfig | null,
): Promise<{ id: string; handle: string } | null> {
  const [user] = await db
    .update(users)
    .set({ themeConfig, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, handle: users.handle });

  return user ?? null;
}
