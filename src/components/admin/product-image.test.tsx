import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductImage } from "./product-image";

describe("ProductImage", () => {
  it("renders the image when a source is given", () => {
    render(
      <ProductImage src="https://example.com/a.jpg" alt="Foto de Jaqueta" />,
    );

    const img = screen.getByAltText("Foto de Jaqueta");
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("shows a fallback when there is no source", () => {
    render(<ProductImage src={null} alt="Foto de Jaqueta" />);

    expect(
      screen.getByText("Não foi possível carregar esta imagem."),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("Foto de Jaqueta")).not.toBeInTheDocument();
  });

  it("falls back when the image fails to load", () => {
    render(
      <ProductImage
        src="https://example.com/broken.jpg"
        alt="Foto de Jaqueta"
      />,
    );

    fireEvent.error(screen.getByAltText("Foto de Jaqueta"));

    expect(
      screen.getByText("Não foi possível carregar esta imagem."),
    ).toBeInTheDocument();
  });
});
