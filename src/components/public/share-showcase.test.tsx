import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareShowcase } from "./share-showcase";

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, {
    clipboard: { writeText },
  });
});

describe("ShareShowcase", () => {
  it("renders an encoded WhatsApp link", () => {
    render(<ShareShowcase url="https://exemplo.com/pam" />);

    expect(
      screen.getByRole("link", { name: "Compartilhar no WhatsApp" }),
    ).toHaveAttribute(
      "href",
      "https://wa.me/?text=Olha%20os%20produtos%20desta%20live%3A%20https%3A%2F%2Fexemplo.com%2Fpam",
    );
  });

  it("copies the public URL and announces success", async () => {
    writeText.mockResolvedValue(undefined);
    render(<ShareShowcase url="https://exemplo.com/pam" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://exemplo.com/pam");
    });
    expect(screen.getByText("O link está pronto para colar.")).toBeInTheDocument();
  });

  it("announces copy errors", async () => {
    writeText.mockRejectedValue(new Error("Nope"));
    render(<ShareShowcase url="https://exemplo.com/pam" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    expect(await screen.findByText("Não foi possível copiar.")).toBeInTheDocument();
  });
});
