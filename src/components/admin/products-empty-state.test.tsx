import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductsEmptyState } from "./products-empty-state";

describe("ProductsEmptyState", () => {
  it("shows guidance and a CTA linking to the new product page", () => {
    render(<ProductsEmptyState liveId="live-1" />);

    expect(
      screen.getByText("Nenhum produto adicionado ainda"),
    ).toBeInTheDocument();

    const bulkCta = screen.getByRole("link", { name: "Adicionar produtos" });
    expect(bulkCta).toHaveAttribute(
      "href",
      "/admin/lives/live-1/products/import",
    );

    const singleCta = screen.getByRole("link", {
      name: "Adicionar apenas um produto",
    });
    expect(singleCta).toHaveAttribute(
      "href",
      "/admin/lives/live-1/products/new",
    );
  });
});
