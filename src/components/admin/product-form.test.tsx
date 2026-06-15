import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProductAction } from "@/server/actions/products";
import { ProductForm } from "./product-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/server/actions/products", () => ({
  createProductAction: vi.fn(),
  updateProductAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const validValues = {
  name: "Jaqueta jeans oversized",
  category: "Jaquetas",
  size: "M",
  color: "Azul claro",
  imageUrl: "https://exemplo.com/imagem.jpg",
  productUrl: "https://loja.com/produto",
  price: "199,90",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductForm", () => {
  it("renders the core fields in create mode", () => {
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    expect(screen.getByLabelText("Nome do produto")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toBeInTheDocument();
    expect(screen.getByLabelText("Link da imagem")).toBeInTheDocument();
    expect(screen.getByLabelText("Link para comprar")).toBeInTheDocument();
  });

  it("prefills the fields in edit mode", () => {
    render(
      <ProductForm
        mode="edit"
        liveId="live-1"
        productId="33333333-3333-4333-a333-333333333333"
        initialValues={validValues}
        categorySuggestions={["Jaquetas"]}
      />,
    );

    expect(screen.getByLabelText("Nome do produto")).toHaveValue(
      "Jaqueta jeans oversized",
    );
    expect(screen.getByLabelText("Link para comprar")).toHaveValue(
      "https://loja.com/produto",
    );
  });

  it("shows a validation error for an unsafe image url", async () => {
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: validValues.name },
    });
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: { value: validValues.category },
    });
    fireEvent.change(screen.getByLabelText("Link da imagem"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.change(screen.getByLabelText("Link para comprar"), {
      target: { value: validValues.productUrl },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));

    expect(
      await screen.findByText(
        "Cole o endereço de uma imagem pública (http/https).",
      ),
    ).toBeInTheDocument();
    expect(createProductAction).not.toHaveBeenCalled();
  });

  it("submits valid values and redirects to the live", async () => {
    vi.mocked(createProductAction).mockResolvedValue({
      success: true,
      data: { liveId: "live-1" },
    });

    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: validValues.name },
    });
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: { value: validValues.category },
    });
    fireEvent.change(screen.getByLabelText("Link da imagem"), {
      target: { value: validValues.imageUrl },
    });
    fireEvent.change(screen.getByLabelText("Link para comprar"), {
      target: { value: validValues.productUrl },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));

    await waitFor(() => {
      expect(createProductAction).toHaveBeenCalledTimes(1);
    });
    expect(push).toHaveBeenCalledWith("/admin/lives/live-1");
  });

  it("fills empty fields from extraction but preserves typed ones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          success: true,
          data: {
            sourceUrl: "https://loja.exemplo.com/p",
            finalUrl: "https://loja.exemplo.com/p",
            name: "Nome extraído",
            imageUrl: "https://a/x.jpg",
            price: "199.90",
            color: "Verde",
            fieldsFound: ["name", "imageUrl", "price", "color"],
            extractionSource: "json-ld",
            completeness: "complete",
            fromCache: false,
          },
        }),
      })),
    );

    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    // The creator types a name first (becomes a dirty field).
    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: "Meu nome" },
    });

    fireEvent.change(screen.getByLabelText("Link do produto"), {
      target: { value: "https://loja.exemplo.com/p" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar informações/ }));

    // Empty field gets filled...
    await waitFor(() => {
      expect(screen.getByLabelText("Link da imagem")).toHaveValue(
        "https://a/x.jpg",
      );
    });
    // ...the manually typed name is preserved.
    expect(screen.getByLabelText("Nome do produto")).toHaveValue("Meu nome");
    expect(
      await screen.findByText(
        "Alguns campos que você já havia preenchido foram mantidos.",
      ),
    ).toBeInTheDocument();
  });
});
