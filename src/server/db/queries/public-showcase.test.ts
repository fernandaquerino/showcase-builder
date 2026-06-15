import { beforeEach, describe, expect, it, vi } from "vitest";

const usersFindFirst = vi.hoisted(() => vi.fn());
const livesFindFirst = vi.hoisted(() => vi.fn());
const orderedProducts = vi.hoisted(() => vi.fn());
const unstableCache = vi.hoisted(() =>
  vi.fn((callback: () => unknown) => callback),
);

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: unstableCache,
}));
vi.mock("@/server/db", () => ({
  db: {
    query: {
      users: { findFirst: usersFindFirst },
      lives: { findFirst: livesFindFirst },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: orderedProducts,
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({ limit: vi.fn() })),
          })),
        })),
      })),
    })),
  },
}));

import {
  getCachedPublishedShowcaseByHandle,
  getPublishedShowcaseByHandle,
} from "./public-showcase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublishedShowcaseByHandle", () => {
  it("returns null for an unknown handle", async () => {
    usersFindFirst.mockResolvedValue(null);

    await expect(getPublishedShowcaseByHandle("missing")).resolves.toBeNull();
    expect(livesFindFirst).not.toHaveBeenCalled();
  });

  it("returns the creator with no live when nothing is published", async () => {
    usersFindFirst.mockResolvedValue({
      id: "user-1",
      name: "Pam Braga",
      handle: "pambraga",
      image: null,
    });
    livesFindFirst.mockResolvedValue(null);

    await expect(getPublishedShowcaseByHandle("pambraga")).resolves.toEqual({
      creator: { name: "Pam Braga", handle: "pambraga", avatarUrl: null },
      live: null,
      products: [],
    });
  });

  it("returns null when a slug is requested but no published live matches it", async () => {
    usersFindFirst.mockResolvedValue({
      id: "user-1",
      name: "Pam Braga",
      handle: "pambraga",
      image: null,
    });
    livesFindFirst.mockResolvedValue(null);

    await expect(
      getPublishedShowcaseByHandle("pambraga", "live-antiga"),
    ).resolves.toBeNull();
  });

  it("returns only public live and product fields ordered by position", async () => {
    const live = {
      id: "live-1",
      title: "Live C&A",
      liveDate: "2026-06-20",
      liveTime: "20:00",
      coverImageUrl: "https://cdn.exemplo.com/live.jpg",
      instagramUrl: "https://www.instagram.com/pam",
      slug: "live-ca",
      publishedAt: new Date("2026-06-20T20:00:00Z"),
    };
    const products = [
      {
        id: "product-1",
        name: "Jaqueta",
        category: "Jaquetas",
        size: "M",
        color: "Preto",
        imageUrl: "https://cdn.exemplo.com/a.jpg",
        productUrl: "https://loja.exemplo.com/a",
        price: "199.90",
        position: 0,
      },
    ];

    usersFindFirst.mockResolvedValue({
      id: "user-1",
      name: "Pam Braga",
      handle: "pambraga",
      image: "https://cdn.exemplo.com/avatar.jpg",
    });
    livesFindFirst.mockResolvedValue(live);
    orderedProducts.mockResolvedValue(products);

    const result = await getPublishedShowcaseByHandle("pambraga");

    expect(result).toEqual({
      creator: {
        name: "Pam Braga",
        handle: "pambraga",
        avatarUrl: "https://cdn.exemplo.com/avatar.jpg",
      },
      live,
      products,
    });
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("uses a separate cache key for a specific live slug", async () => {
    usersFindFirst.mockResolvedValue(null);

    await getCachedPublishedShowcaseByHandle("pambraga", "live-ca");

    expect(unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["published-showcase:pambraga:live-ca"],
      expect.objectContaining({
        tags: ["showcase:pambraga"],
      }),
    );
  });
});
