import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultLiveTheme } from "@/lib/live-theme";
import { updateAccountAppearanceAction } from "@/server/actions/account";
import { LiveAppearanceSection } from "./live-appearance-section";

vi.mock("@/server/actions/account", () => ({
  updateAccountAppearanceAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LiveAppearanceSection", () => {
  it("renders theme controls and live preview", () => {
    render(
      <LiveAppearanceSection
        title="Live de Inverno"
        coverImageUrl={null}
        initialTheme={null}
        products={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Aparência da vitrine" })).toBeInTheDocument();
    expect(screen.getByText("Clássico")).toBeInTheDocument();
    expect(screen.getByLabelText("Hexadecimal da cor principal")).toHaveValue(
      getDefaultLiveTheme().primaryColor,
    );
    expect(screen.getByLabelText("Prévia visual da página da live")).toHaveTextContent(
      "Live de Inverno",
    );
  });

  it("tracks unsaved changes and saves the selected theme", async () => {
    vi.mocked(updateAccountAppearanceAction).mockResolvedValue({ success: true });

    render(
      <LiveAppearanceSection
        title="Live de Inverno"
        coverImageUrl={null}
        initialTheme={null}
        products={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fashion Mais presença para campanhas e lançamentos." }));

    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar aparência" }));

    await waitFor(() => {
      expect(updateAccountAppearanceAction).toHaveBeenCalledWith(
        expect.objectContaining({ preset: "fashion" }),
      );
    });
  });

  it("restores the default theme after confirmation", async () => {
    vi.mocked(updateAccountAppearanceAction).mockResolvedValue({ success: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <LiveAppearanceSection
        title="Live de Inverno"
        coverImageUrl={null}
        initialTheme={{ ...getDefaultLiveTheme(), preset: "night" }}
        products={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Restaurar tema padrão" }));

    await waitFor(() => {
      expect(updateAccountAppearanceAction).toHaveBeenCalledWith(null);
    });
  });
});
