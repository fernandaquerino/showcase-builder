import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { auth } from "@/lib/auth";
import { updateAccountAppearanceAction } from "@/server/actions/account";
import { updateUserThemeConfig } from "@/server/db/queries/users";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("@/server/db/queries/users", () => ({
  updateUserThemeConfig: vi.fn(),
}));

const authMock = auth as unknown as Mock;
const USER_ID = "11111111-1111-4111-a111-111111111111";

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateAccountAppearanceAction", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await updateAccountAppearanceAction(validTheme);

    expect(result.success).toBe(false);
    expect(updateUserThemeConfig).not.toHaveBeenCalled();
  });

  it("updates the theme for the session user", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID }, expires: "" });
    vi.mocked(updateUserThemeConfig).mockResolvedValue({
      id: USER_ID,
      handle: "pambraga",
    });

    const result = await updateAccountAppearanceAction(validTheme);

    expect(result.success).toBe(true);
    expect(updateUserThemeConfig).toHaveBeenCalledWith(USER_ID, validTheme);
  });

  it("clears the theme when restoring the default", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID }, expires: "" });
    vi.mocked(updateUserThemeConfig).mockResolvedValue({
      id: USER_ID,
      handle: "pambraga",
    });

    await updateAccountAppearanceAction(null);

    expect(updateUserThemeConfig).toHaveBeenCalledWith(USER_ID, null);
  });

  it("rejects invalid payloads", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID }, expires: "" });

    const result = await updateAccountAppearanceAction({
      ...validTheme,
      primaryColor: "red",
    });

    expect(result.success).toBe(false);
    expect(updateUserThemeConfig).not.toHaveBeenCalled();
  });
});
