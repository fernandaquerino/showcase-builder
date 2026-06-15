import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExtractionSuccessData } from "@/lib/validations/extract";
import { ProductLinkExtractor } from "./product-link-extractor";

function successData(
  overrides: Partial<ExtractionSuccessData> = {},
): ExtractionSuccessData {
  return {
    affiliateUrl: "https://loja.exemplo.com/p/1?utm_campaign=criadora",
    sourceUrl: "https://loja.exemplo.com/p/1?utm_campaign=criadora",
    canonicalUrl: "https://loja.exemplo.com/p/1",
    finalUrl: "https://loja.exemplo.com/p/1",
    sku: "SKU-1",
    name: "Jaqueta",
    imageUrl: "https://a/x.jpg",
    price: "199.90",
    color: "Azul",
    category: "Jaquetas",
    brand: "Mindset",
    availableSizes: ["P", "M"],
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

function mockFetchJson(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => payload })),
  );
}

const baseProps = {
  mode: "create" as const,
  onApply: vi.fn(() => ({ filled: 0, preserved: 0 })),
  onUrlChange: vi.fn(),
  onRevealForm: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductLinkExtractor", () => {
  it("renders the link-first actions", () => {
    render(<ProductLinkExtractor {...baseProps} />);

    expect(
      screen.getByLabelText("Cole seu link de afiliado"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Buscar produto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Prefiro preencher manualmente" }),
    ).toBeInTheDocument();
  });

  it("reveals the manual form without making a request", () => {
    const onRevealForm = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductLinkExtractor {...baseProps} onRevealForm={onRevealForm} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Prefiro preencher manualmente" }),
    );
    expect(onRevealForm).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies a complete result and reveals the form", async () => {
    mockFetchJson({ success: true, data: successData() });
    const onApply = vi.fn(() => ({ filled: 5, preserved: 0 }));
    const onRevealForm = vi.fn();
    render(
      <ProductLinkExtractor
        {...baseProps}
        onApply={onApply}
        onRevealForm={onRevealForm}
      />,
    );

    fireEvent.change(screen.getByLabelText("Cole seu link de afiliado"), {
      target: { value: successData().affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    expect(await screen.findByText("Produto encontrado")).toBeInTheDocument();
    expect(onApply).toHaveBeenCalledOnce();
    expect(onRevealForm).toHaveBeenCalledOnce();
  });

  it("shows partial and dirty-field messages", async () => {
    mockFetchJson({
      success: true,
      data: successData({ completeness: "partial", imageUrl: null }),
    });
    render(
      <ProductLinkExtractor
        {...baseProps}
        onApply={() => ({ filled: 1, preserved: 2 })}
      />,
    );

    fireEvent.change(screen.getByLabelText("Cole seu link de afiliado"), {
      target: { value: successData().affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    expect(
      await screen.findByText("Encontramos algumas informações"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mantivemos os campos que você já tinha preenchido."),
    ).toBeInTheDocument();
  });

  it("opens the manual fallback after a failure", async () => {
    mockFetchJson({
      success: false,
      error: { code: "UPSTREAM_BLOCKED", message: "Tente manualmente." },
    });
    const onRevealForm = vi.fn();
    render(<ProductLinkExtractor {...baseProps} onRevealForm={onRevealForm} />);

    fireEvent.change(screen.getByLabelText("Cole seu link de afiliado"), {
      target: { value: successData().affiliateUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não conseguimos encontrar os dados automaticamente",
    );
    expect(onRevealForm).toHaveBeenCalledOnce();
  });

  it("uses the re-extraction label in edit mode", () => {
    render(<ProductLinkExtractor {...baseProps} mode="edit" />);
    expect(
      screen.getByRole("button", { name: "Buscar informações novamente" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Prefiro preencher manualmente" }),
    ).not.toBeInTheDocument();
  });
});
