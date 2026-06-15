import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicProductCard } from "./public-product-card";

const product = {
  id: "11111111-1111-4111-a111-111111111111",
  name: "Jaqueta preta",
  category: "Jaquetas",
  size: "M",
  color: "Preto",
  imageUrl: "https://cdn.exemplo.com/jaqueta.jpg",
  productUrl: "https://loja.exemplo.com/produto",
  price: "199.90",
  position: 0,
};

describe("PublicProductCard", () => {
  it("renders product details, formatted price and a safe external link", () => {
    render(<PublicProductCard product={product} store="C&A" />);

    expect(screen.getByText("Jaqueta preta")).toBeInTheDocument();
    expect(screen.getByText("Jaquetas")).toBeInTheDocument();
    expect(screen.getByText("Tam. M · Preto")).toBeInTheDocument();
    expect(screen.getByText("R$ 199,90")).toBeInTheDocument();
    expect(screen.getByAltText("Jaqueta preta")).toHaveAttribute(
      "src",
      product.imageUrl,
    );

    const link = screen.getByRole("link", { name: /Ver na C&A/ });
    expect(link).toHaveAttribute("href", product.productUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer sponsored");
  });

  it("hides optional fields and shows image fallback on load failure", () => {
    render(
      <PublicProductCard
        product={{ ...product, size: null, color: null, price: null }}
        store="Loja"
      />,
    );

    expect(screen.queryByText("Tam. M · Preto")).not.toBeInTheDocument();
    expect(screen.queryByText("R$ 199,90")).not.toBeInTheDocument();

    fireEvent.error(screen.getByAltText("Jaqueta preta"));
    expect(screen.getByText("Imagem indisponível")).toBeInTheDocument();
  });
});
