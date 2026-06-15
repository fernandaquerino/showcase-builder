import "server-only";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { getServerEnv } from "@/lib/env";
import { getHandleSuggestion } from "@/lib/handle";
import { loginSchema } from "@/lib/validations/auth";
import { db } from "@/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";

const env = getServerEnv();
const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: string }).code === "23505"
  );
}

async function createOAuthUser(data: AdapterUser): Promise<AdapterUser> {
  const email = data.email.toLowerCase();
  const name = data.name?.trim() || email.split("@")[0] || "Criadora";
  const baseHandle = getHandleSuggestion(name, email) || "criadora";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${crypto.randomUUID().slice(0, 6)}`;
    const handle = `${baseHandle.slice(0, 30 - suffix.length)}${suffix}`;

    try {
      const [user] = await db
        .insert(users)
        .values({
          email,
          name,
          handle,
          image: data.image,
          emailVerified: data.emailVerified,
        })
        .returning();

      if (!user) {
        throw new Error("Unable to create OAuth user.");
      }

      return user;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique handle for OAuth user.");
}

const adapter: Adapter = {
  ...baseAdapter,
  createUser: createOAuthUser,
};

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = loginSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.email, parsed.data.email),
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = await compare(
        parsed.data.password,
        user.passwordHash,
      );

      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        handle: user.handle,
      };
    },
  }),
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter,
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.handle = user.handle;
      }

      return token;
    },
    session({ session, token }) {
      if (
        session.user &&
        typeof token.id === "string" &&
        typeof token.handle === "string"
      ) {
        session.user.id = token.id;
        session.user.handle = token.handle;
      }

      return session;
    },
  },
});
