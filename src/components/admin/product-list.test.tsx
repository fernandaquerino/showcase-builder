import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { moveProductDownAction } from "@/server/actions/products";
import { ProductList } from "./product-list";
import type { ProductCardData } from "./sortable-product-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/server/actions/products", () => ({
  reorderProductsAction: vi.fn(),
  moveProductUpAction: vi.fn(),
  moveProductDownAction: vi.fn(),
  deleteProductAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const products: ProductCardData[] = [
  {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Jaqueta jeans",
    category: "Jaquetas",
    size: "M",
    color: "Azul",
    imageUrl: "https://exemplo.com/a.jpg",
    price: "199.90",
  },
  {
    id: "22222222-2222-4222-a222-222222222222",
    name: "Blusa branca",
    category: "Blusas",
    size: null,
    color: null,
    imageUrl: "https://exemplo.com/b.jpg",
    price: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProductList", () => {
  it("renders each product with its formatted price and edit link", () => {
    render(<ProductList liveId="live-1" products={products} />);

    expect(screen.getByText("Jaqueta jeans")).toBeInTheDocument();
    expect(screen.getByText("Blusa branca")).toBeInTheDocument();
    expect(screen.getByText("R$ 199,90")).toBeInTheDocument();

    const editLinks = screen.getAllByRole("link", { name: "Editar" });
    expect(editLinks[0]).toHaveAttribute(
      "href",
      "/admin/lives/live-1/products/11111111-1111-4111-a111-111111111111",
    );
  });

  it("disables 'move up' for the first product and 'move down' for the last", () => {
    render(<ProductList liveId="live-1" products={products} />);

    expect(
      screen.getByRole("button", { name: "Mover Jaqueta jeans para cima" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mover Blusa branca para baixo" }),
    ).toBeDisabled();
  });

  it("calls moveProductDownAction when moving the first product down", async () => {
    vi.mocked(moveProductDownAction).mockResolvedValue({ success: true });

    render(<ProductList liveId="live-1" products={products} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mover Jaqueta jeans para baixo" }),
    );

    await waitFor(() => {
      expect(moveProductDownAction).toHaveBeenCalledWith(
        "live-1",
        "11111111-1111-4111-a111-111111111111",
      );
    });
  });
});
