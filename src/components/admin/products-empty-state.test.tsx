import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductsEmptyState } from "./products-empty-state";

describe("ProductsEmptyState", () => {
  it("shows compact guidance and keeps the manual product fallback", () => {
    render(<ProductsEmptyState liveId="live-1" />);

    expect(
      screen.getByText("Nenhum produto adicionado ainda"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Cole os links acima para começar ou cadastre uma peça manualmente.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Adicionar produtos" }),
    ).not.toBeInTheDocument();

    const singleCta = screen.getByRole("link", {
      name: "Adicionar apenas um produto",
    });
    expect(singleCta).toHaveAttribute(
      "href",
      "/admin/lives/live-1/products/new",
    );
  });
});
