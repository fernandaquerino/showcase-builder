import "server-only";

import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";

import {
  SHOWCASE_REVALIDATE_SECONDS,
  showcaseTag,
} from "@/server/cache/showcase";
import { db } from "@/server/db";
import { lives, products, users } from "@/server/db/schema";

export type PublicCreator = {
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type PublicLive = {
  id: string;
  title: string;
  subtitle: string | null;
  store: string;
  liveDate: string;
  liveTime: string | null;
  platform: string | null;
  slug: string;
  publishedAt: Date | null;
};

export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  size: string | null;
  color: string | null;
  imageUrl: string;
  productUrl: string;
  price: string | null;
  position: number;
};

export type PublicShowcase = {
  creator: PublicCreator;
  live: PublicLive | null;
  products: PublicProduct[];
};

export type PublishedLiveContext = {
  handle: string;
  liveId: string;
  status: "draft" | "published";
} | null;

export async function getPublishedShowcaseByHandle(
  handle: string,
): Promise<PublicShowcase | null> {
  const creator = await db.query.users.findFirst({
    columns: {
      id: true,
      name: true,
      handle: true,
      image: true,
    },
    where: eq(users.handle, handle),
  });

  if (!creator) {
    return null;
  }

  const live = await db.query.lives.findFirst({
    columns: {
      id: true,
      title: true,
      subtitle: true,
      store: true,
      liveDate: true,
      liveTime: true,
      platform: true,
      slug: true,
      publishedAt: true,
    },
    where: (table, { and }) =>
      and(eq(table.userId, creator.id), eq(table.status, "published")),
  });

  if (!live) {
    return {
      creator: {
        name: creator.name,
        handle: creator.handle,
        avatarUrl: creator.image,
      },
      live: null,
      products: [],
    };
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      size: products.size,
      color: products.color,
      imageUrl: products.imageUrl,
      productUrl: products.productUrl,
      price: products.price,
      position: products.position,
    })
    .from(products)
    .where(eq(products.liveId, live.id))
    .orderBy(asc(products.position));

  return {
    creator: {
      name: creator.name,
      handle: creator.handle,
      avatarUrl: creator.image,
    },
    live,
    products: productRows,
  };
}

export function getCachedPublishedShowcaseByHandle(
  handle: string,
): Promise<PublicShowcase | null> {
  return unstable_cache(
    () => getPublishedShowcaseByHandle(handle),
    [`published-showcase:${handle}`],
    {
      revalidate: SHOWCASE_REVALIDATE_SECONDS,
      tags: [showcaseTag(handle)],
    },
  )();
}

export async function getPublishedLiveContextById(
  liveId: string,
): Promise<PublishedLiveContext> {
  const row = await db
    .select({
      handle: users.handle,
      liveId: lives.id,
      status: lives.status,
    })
    .from(lives)
    .innerJoin(users, eq(lives.userId, users.id))
    .where(eq(lives.id, liveId))
    .limit(1);

  const live = row[0];
  return live
    ? { handle: live.handle, liveId: live.liveId, status: live.status }
    : null;
}
