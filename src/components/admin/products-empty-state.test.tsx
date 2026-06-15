import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductsEmptyState } from "./products-empty-state";

describe("ProductsEmptyState", () => {
  it("shows guidance and a CTA linking to the new product page", () => {
    render(<ProductsEmptyState liveId="live-1" />);

    expect(
      screen.getByText("Nenhum produto adicionado ainda"),
    ).toBeInTheDocument();

    const cta = screen.getByRole("link", {
      name: "Adicionar primeiro produto",
    });
    expect(cta).toHaveAttribute("href", "/admin/lives/live-1/products/new");
  });
});
