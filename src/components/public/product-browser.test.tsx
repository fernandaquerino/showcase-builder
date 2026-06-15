import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductBrowser } from "./product-browser";

const products = [
  {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Jaqueta preta",
    category: "Jaquetas",
    size: null,
    color: null,
    imageUrl: "https://cdn.exemplo.com/a.jpg",
    productUrl: "https://loja.exemplo.com/a",
    price: null,
    position: 0,
  },
  {
    id: "22222222-2222-4222-a222-222222222222",
    name: "Blusa branca",
    category: "Blusas",
    size: null,
    color: null,
    imageUrl: "https://cdn.exemplo.com/b.jpg",
    productUrl: "https://loja.exemplo.com/b",
    price: null,
    position: 1,
  },
];

describe("ProductBrowser", () => {
  it("filters products by category and updates the counter", () => {
    render(<ProductBrowser products={products} />);

    expect(screen.getByText("2 de 2 produtos")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jaquetas (1)" }));

    expect(screen.getByText("1 de 2 produtos")).toBeInTheDocument();
    expect(screen.getByText("Jaqueta preta")).toBeInTheDocument();
    expect(screen.queryByText("Blusa branca")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tudo (2)" }));
    expect(screen.getByText("2 de 2 produtos")).toBeInTheDocument();
  });

  it("shows the empty live state when there are no products", () => {
    render(<ProductBrowser products={[]} />);

    expect(
      screen.getByText("Os produtos desta live serão adicionados em breve."),
    ).toBeInTheDocument();
  });
});
