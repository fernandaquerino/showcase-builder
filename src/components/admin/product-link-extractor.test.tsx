import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExtractionSuccessData } from "@/lib/validations/extract";
import { ProductLinkExtractor } from "./product-link-extractor";

function successData(
  overrides: Partial<ExtractionSuccessData> = {},
): ExtractionSuccessData {
  return {
    sourceUrl: "https://loja.exemplo.com/p/1",
    finalUrl: "https://loja.exemplo.com/p/1",
    name: "Jaqueta",
    imageUrl: "https://a/x.jpg",
    price: "199.90",
    color: "Azul",
    fieldsFound: ["name", "imageUrl", "price", "color"],
    extractionSource: "json-ld",
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductLinkExtractor", () => {
  it("renders the field and the search button", () => {
    render(<ProductLinkExtractor onApply={() => ({ filled: 0, preserved: 0 })} />);

    expect(screen.getByLabelText("Link do produto")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Buscar informações/ }),
    ).toBeInTheDocument();
  });

  it("applies a complete result and shows success", async () => {
    mockFetchJson({ success: true, data: successData() });
    const onApply = vi.fn(() => ({ filled: 4, preserved: 0 }));

    render(<ProductLinkExtractor onApply={onApply} />);

    fireEvent.change(screen.getByLabelText("Link do produto"), {
      target: { value: "https://loja.exemplo.com/p/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar informações/ }));

    expect(
      await screen.findByText("Informações encontradas"),
    ).toBeInTheDocument();
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("shows the partial message and preserved note", async () => {
    mockFetchJson({
      success: true,
      data: successData({ completeness: "partial", imageUrl: null }),
    });

    render(<ProductLinkExtractor onApply={() => ({ filled: 1, preserved: 2 })} />);

    fireEvent.change(screen.getByLabelText("Link do produto"), {
      target: { value: "https://loja.exemplo.com/p/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar informações/ }));

    expect(
      await screen.findByText("Encontramos parte das informações"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Alguns campos que você já havia preenchido foram mantidos.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a friendly error and never calls onApply on failure", async () => {
    mockFetchJson({
      success: false,
      error: { code: "UPSTREAM_BLOCKED", message: "A loja não permitiu agora." },
    });
    const onApply = vi.fn(() => ({ filled: 0, preserved: 0 }));

    render(<ProductLinkExtractor onApply={onApply} />);

    fireEvent.change(screen.getByLabelText("Link do produto"), {
      target: { value: "https://loja.exemplo.com/p/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar informações/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A loja não permitiu agora.",
    );
    expect(onApply).not.toHaveBeenCalled();
  });

  it("falls back to a manual message when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    render(<ProductLinkExtractor onApply={() => ({ filled: 0, preserved: 0 })} />);

    fireEvent.change(screen.getByLabelText("Link do produto"), {
      target: { value: "https://loja.exemplo.com/p/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar informações/ }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
