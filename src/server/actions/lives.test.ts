import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { auth } from "@/lib/auth";
import {
  createLiveAction,
  deleteLiveAction,
  publishLiveAction,
  unpublishLiveAction,
  updateLiveThemeAction,
  updateLiveAction,
} from "@/server/actions/lives";
import {
  createLive,
  deleteLive,
  getLiveByIdForUser,
  isLiveSlugAvailable,
  publishLive,
  unpublishLive,
  updateLive,
  updateLiveTheme,
} from "@/server/db/queries/lives";
import { deleteCoverImage } from "@/server/lib/storage/cover-image";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("@/server/db/queries/lives", () => ({
  createLive: vi.fn(),
  updateLive: vi.fn(),
  publishLive: vi.fn(),
  unpublishLive: vi.fn(),
  deleteLive: vi.fn(),
  updateLiveTheme: vi.fn(),
  getLiveByIdForUser: vi.fn(),
  isLiveSlugAvailable: vi.fn(),
}));
vi.mock("@/server/db/queries/public-showcase", () => ({
  getPublishedLiveContextById: vi.fn(),
}));
vi.mock("@/server/lib/storage/cover-image", () => ({
  deleteCoverImage: vi.fn(),
}));

// `auth` is heavily overloaded (middleware/route/RSC); treat it as a plain mock.
const authMock = auth as unknown as Mock;
const USER_ID = "11111111-1111-4111-a111-111111111111";
const LIVE_ID = "22222222-2222-4222-a222-222222222222";

function signedIn(userId = USER_ID) {
  authMock.mockResolvedValue({ user: { id: userId }, expires: "" });
}

const validInput = {
  title: "Live de Inverno",
  liveDate: "2026-06-20",
  liveTime: "20:00",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishLiveAction", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await publishLiveAction(LIVE_ID);

    expect(result.success).toBe(false);
    expect(publishLive).not.toHaveBeenCalled();
  });

  it("publishes scoping the query to the session user", async () => {
    signedIn();
    vi.mocked(publishLive).mockResolvedValue({ id: LIVE_ID });

    const result = await publishLiveAction(LIVE_ID);

    expect(result.success).toBe(true);
    expect(publishLive).toHaveBeenCalledWith(LIVE_ID, USER_ID);
  });

  it("returns not found when the live does not belong to the user", async () => {
    signedIn();
    vi.mocked(publishLive).mockResolvedValue(null);

    const result = await publishLiveAction(LIVE_ID);

    expect(result).toEqual({
      success: false,
      message: "Não encontramos essa live.",
    });
  });
});

describe("unpublishLiveAction", () => {
  it("returns not found when nothing matched the owner", async () => {
    signedIn();
    vi.mocked(unpublishLive).mockResolvedValue(null);

    const result = await unpublishLiveAction(LIVE_ID);

    expect(result.success).toBe(false);
    expect(unpublishLive).toHaveBeenCalledWith(LIVE_ID, USER_ID);
  });
});

describe("deleteLiveAction", () => {
  it("deletes scoped to the session user", async () => {
    signedIn();
    vi.mocked(deleteLive).mockResolvedValue({ id: LIVE_ID });

    const result = await deleteLiveAction(LIVE_ID);

    expect(result.success).toBe(true);
    expect(deleteLive).toHaveBeenCalledWith(LIVE_ID, USER_ID);
  });

  it("removes the cover blob of the deleted live", async () => {
    signedIn();
    vi.mocked(getLiveByIdForUser).mockResolvedValue({
      coverImageUrl: "https://blob.example.com/lives/u/abc.jpg",
    } as never);
    vi.mocked(deleteLive).mockResolvedValue({ id: LIVE_ID });

    await deleteLiveAction(LIVE_ID);

    expect(deleteCoverImage).toHaveBeenCalledWith(
      "https://blob.example.com/lives/u/abc.jpg",
    );
  });
});

describe("updateLiveAction cover cleanup", () => {
  it("deletes the previous cover only when it changed", async () => {
    signedIn();
    vi.mocked(isLiveSlugAvailable).mockResolvedValue(true);
    vi.mocked(getLiveByIdForUser).mockResolvedValue({
      coverImageUrl: "https://blob.example.com/lives/u/old.jpg",
    } as never);
    vi.mocked(updateLive).mockResolvedValue({
      id: LIVE_ID,
      status: "draft",
      coverImageUrl: "https://blob.example.com/lives/u/new.jpg",
    } as never);

    await updateLiveAction(LIVE_ID, {
      ...validInput,
      coverImageUrl: "https://blob.example.com/lives/u/new.jpg",
    });

    expect(deleteCoverImage).toHaveBeenCalledWith(
      "https://blob.example.com/lives/u/old.jpg",
    );
  });

  it("keeps the cover when it is unchanged", async () => {
    signedIn();
    vi.mocked(isLiveSlugAvailable).mockResolvedValue(true);
    const same = "https://blob.example.com/lives/u/same.jpg";
    vi.mocked(getLiveByIdForUser).mockResolvedValue({
      coverImageUrl: same,
    } as never);
    vi.mocked(updateLive).mockResolvedValue({
      id: LIVE_ID,
      status: "draft",
      coverImageUrl: same,
    } as never);

    await updateLiveAction(LIVE_ID, { ...validInput, coverImageUrl: same });

    expect(deleteCoverImage).not.toHaveBeenCalled();
  });
});

describe("createLiveAction", () => {
  it("rejects an invalid id format is irrelevant but ignores client userId", async () => {
    signedIn();
    vi.mocked(isLiveSlugAvailable).mockResolvedValue(true);
    vi.mocked(createLive).mockResolvedValue({ id: LIVE_ID } as never);

    const result = await createLiveAction({
      ...validInput,
      // @ts-expect-error attacker-supplied field must be ignored
      userId: "attacker",
    });

    expect(result.success).toBe(true);
    const [calledUserId] = vi.mocked(createLive).mock.calls[0];
    expect(calledUserId).toBe(USER_ID);
  });

  it("appends a numeric suffix when the slug is taken", async () => {
    signedIn();
    vi.mocked(isLiveSlugAvailable)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    vi.mocked(createLive).mockResolvedValue({ id: LIVE_ID } as never);

    await createLiveAction(validInput);

    const [, payload] = vi.mocked(createLive).mock.calls[0];
    expect(payload.slug).toBe("live-de-inverno-2");
  });

  it("generates the slug from the title on the server", async () => {
    signedIn();
    vi.mocked(isLiveSlugAvailable).mockResolvedValue(true);
    vi.mocked(createLive).mockResolvedValue({ id: LIVE_ID } as never);

    await createLiveAction({
      ...validInput,
      title: "Minha Live Especial",
      // @ts-expect-error client-supplied slug is ignored by validation
      slug: "slug-manual",
    });

    const [, payload] = vi.mocked(createLive).mock.calls[0];
    expect(payload.slug).toBe("minha-live-especial");
  });

  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await createLiveAction(validInput);

    expect(result.success).toBe(false);
    expect(createLive).not.toHaveBeenCalled();
  });
});

describe("updateLiveThemeAction", () => {
  const validTheme = {
    preset: "fashion",
    primaryColor: "#BE185D",
    backgroundColor: "#FFF1F6",
    textMode: "auto",
    buttonStyle: "rounded",
    cardStyle: "shadow",
    fontPreset: "elegant",
    heroStyle: "overlay",
  } as const;

  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await updateLiveThemeAction(LIVE_ID, validTheme);

    expect(result.success).toBe(false);
    expect(updateLiveTheme).not.toHaveBeenCalled();
  });

  it("updates the theme scoped to the session user", async () => {
    signedIn();
    vi.mocked(updateLiveTheme).mockResolvedValue({
      id: LIVE_ID,
      status: "draft",
    } as never);

    const result = await updateLiveThemeAction(LIVE_ID, validTheme);

    expect(result.success).toBe(true);
    expect(updateLiveTheme).toHaveBeenCalledWith(LIVE_ID, USER_ID, validTheme);
  });

  it("clears the theme when restoring the default", async () => {
    signedIn();
    vi.mocked(updateLiveTheme).mockResolvedValue({
      id: LIVE_ID,
      status: "draft",
    } as never);

    await updateLiveThemeAction(LIVE_ID, null);

    expect(updateLiveTheme).toHaveBeenCalledWith(LIVE_ID, USER_ID, null);
  });

  it("rejects invalid payloads", async () => {
    signedIn();

    const result = await updateLiveThemeAction(LIVE_ID, {
      ...validTheme,
      primaryColor: "red",
    });

    expect(result.success).toBe(false);
    expect(updateLiveTheme).not.toHaveBeenCalled();
  });

  it("returns not found when the live does not belong to the user", async () => {
    signedIn();
    vi.mocked(updateLiveTheme).mockResolvedValue(null);

    const result = await updateLiveThemeAction(LIVE_ID, validTheme);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Não encontramos essa live.");
    }
  });
});
