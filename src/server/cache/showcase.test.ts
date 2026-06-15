import { describe, expect, it, vi } from "vitest";

import {
  liveTag,
  revalidatePublicShowcase,
  showcaseTag,
} from "./showcase";

const revalidatePath = vi.hoisted(() => vi.fn());
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath,
  revalidateTag,
}));

describe("showcase cache helpers", () => {
  it("builds stable tags", () => {
    expect(showcaseTag("pambraga")).toBe("showcase:pambraga");
    expect(liveTag("live-1")).toBe("live:live-1");
  });

  it("revalidates the public paths and tags", () => {
    revalidatePublicShowcase({
      handle: "pambraga",
      liveId: "live-1",
      slug: "live-ca",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/pambraga");
    expect(revalidatePath).toHaveBeenCalledWith("/pambraga/live-ca");
    expect(revalidateTag).toHaveBeenCalledWith("showcase:pambraga", "max");
    expect(revalidateTag).toHaveBeenCalledWith("live:live-1", "max");
  });
});
