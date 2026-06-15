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

const affiliateUrl =
  "https://loja.com/produto?p=1&utm_source=mais&utm_campaign=pam";
const validValues = {
  name: "Jaqueta jeans oversized",
  category: "Jaquetas",
  size: "M",
  color: "Azul claro",
  imageUrl: "https://exemplo.com/imagem.jpg",
  productUrl: affiliateUrl,
  price: "199,90",
  sourceUrl: affiliateUrl,
};

function extractionData(overrides: Record<string, unknown> = {}) {
  return {
    affiliateUrl,
    sourceUrl: affiliateUrl,
    canonicalUrl: "https://loja.com/produto?p=1",
    finalUrl: "https://loja.com/produto?p=1",
    sku: "SKU-1",
    name: "nome extraído",
    imageUrl: "https://a/x.jpg",
    price: "199.90",
    color: "Verde",
    category: "moda feminina-jaquetas",
    brand: "C&amp;A",
    availableSizes: ["PP", "P", "M", "G"],
    fieldsFound: [
      "name",
      "imageUrl",
      "price",
      "color",
      "category",
      "brand",
      "sku",
      "availableSizes",
    ],
    extractionSource: "mixed",
    completeness: "complete",
    fromCache: false,
    ...overrides,
  };
}

function mockExtraction(payload = extractionData()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      json: async () => ({ success: true, data: payload }),
    })),
  );
}

function revealManualForm() {
  fireEvent.click(
    screen.getByRole("button", { name: "Prefiro preencher manualmente" }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductForm", () => {
  it("starts in link-first mode and reveals manual fields on request", () => {
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    expect(
      screen.getByLabelText("Cole o link do produto"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome do produto")).not.toBeInTheDocument();

    revealManualForm();
    expect(screen.getByLabelText("Nome do produto")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toBeInTheDocument();
  });

  it("keeps edit fields visible and offers re-extraction", () => {
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
      validValues.name,
    );
    expect(
      screen.getByRole("button", { name: "Buscar informações novamente" }),
    ).toBeInTheDocument();
  });

  it("opens and fills the form after extraction while preserving affiliate URL", async () => {
    mockExtraction();
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    fireEvent.change(screen.getByLabelText("Cole o link do produto"), {
      target: { value: affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    expect(await screen.findByLabelText("Nome do produto")).toHaveValue(
      "Nome extraído",
    );
    expect(screen.getByLabelText("Categoria")).toHaveValue("Moda");
    expect(screen.getByLabelText("Link para comprar")).toHaveValue(
      affiliateUrl,
    );
    expect(screen.getByLabelText("Tamanho mostrado na live")).toHaveValue("");
    expect(screen.getByText("Marca: C&A")).toBeInTheDocument();
  });

  it("shows sizes only as suggestions and applies one after an explicit click", async () => {
    mockExtraction();
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    fireEvent.change(screen.getByLabelText("Cole o link do produto"), {
      target: { value: affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    const sizeInput = await screen.findByLabelText("Tamanho mostrado na live");
    expect(sizeInput).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    expect(sizeInput).toHaveValue("M");
  });

  it("preserves dirty fields during extraction", async () => {
    mockExtraction();
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );
    revealManualForm();
    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: "Meu nome" },
    });
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: { value: "Minha categoria" },
    });
    fireEvent.change(screen.getByLabelText("Cole o link do produto"), {
      target: { value: affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    await screen.findByText("Produto encontrado");
    expect(screen.getByLabelText("Nome do produto")).toHaveValue("Meu nome");
    expect(screen.getByLabelText("Categoria")).toHaveValue("Minha categoria");
    expect(
      screen.getByText("Mantivemos os campos que você já tinha preenchido."),
    ).toBeInTheDocument();
  });

  it("opens the manual fallback and keeps the typed link after failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          success: false,
          error: { code: "NO_PRODUCT_DATA", message: "Complete manualmente." },
        }),
      })),
    );
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );

    fireEvent.change(screen.getByLabelText("Cole o link do produto"), {
      target: { value: affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    expect(await screen.findByLabelText("Nome do produto")).toBeInTheDocument();
    expect(screen.getByLabelText("Link para comprar")).toHaveValue(
      affiliateUrl,
    );
  });

  it("submits the exact affiliate URL as productUrl and sourceUrl", async () => {
    vi.mocked(createProductAction).mockResolvedValue({
      success: true,
      data: { liveId: "live-1" },
    });
    render(
      <ProductForm mode="create" liveId="live-1" categorySuggestions={[]} />,
    );
    fireEvent.change(screen.getByLabelText("Cole o link do produto"), {
      target: { value: affiliateUrl },
    });
    revealManualForm();
    fireEvent.change(screen.getByLabelText("Nome do produto"), {
      target: { value: validValues.name },
    });
    fireEvent.change(screen.getByLabelText("Categoria"), {
      target: { value: validValues.category },
    });
    fireEvent.change(screen.getByLabelText("Link da imagem"), {
      target: { value: validValues.imageUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar à live" }));

    await waitFor(() => expect(createProductAction).toHaveBeenCalledOnce());
    expect(vi.mocked(createProductAction).mock.calls[0][1]).toMatchObject({
      productUrl: affiliateUrl,
      sourceUrl: affiliateUrl,
    });
    expect(push).toHaveBeenCalledWith("/admin/lives/live-1");
  });
});
