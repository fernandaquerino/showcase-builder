import "server-only";

import { eq, or } from "drizzle-orm";

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
