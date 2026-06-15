import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicLiveHero } from "./public-live-hero";

vi.mock("./live-status-panel", () => ({
  LiveStatusPanel: ({
    initialState,
    initialCountdown,
  }: {
    initialState: "scheduled" | "live" | "finished" | "undated";
    initialCountdown: {
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    };
  }) => (
    <div data-testid="status-panel">
      {initialState}-{initialCountdown.seconds}
    </div>
  ),
}));

const creator = {
  name: "Pam Braga",
  handle: "pambraga",
  avatarUrl: "https://cdn.exemplo.com/avatar.jpg",
};

const live = {
  id: "live-1",
  title: "Live de Inverno",
  liveDate: "2026-06-20",
  liveTime: "20:00",
  coverImageUrl: "https://cdn.exemplo.com/capa.jpg",
  instagramUrl: "https://instagram.com/pambraga",
  slug: "live-de-inverno",
  publishedAt: new Date("2026-06-15T10:00:00.000Z"),
};

const products = [
  {
    id: "product-1",
    name: "Jaqueta",
    category: "Jaquetas",
    size: null,
    color: null,
    imageUrl: "https://cdn.exemplo.com/product.jpg",
    productUrl: "https://loja.exemplo.com/product",
    price: null,
    position: 0,
  },
];

describe("PublicLiveHero", () => {
  it("renders cover, creator identity, title, date, time and Instagram CTA", () => {
    render(<PublicLiveHero creator={creator} live={live} products={products} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Live de Inverno",
    );
    expect(screen.getByText("@pambraga")).toBeInTheDocument();
    expect(screen.getByText("20/06/2026")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText("1 produto selecionado")).toBeInTheDocument();
    expect(screen.getByTestId("status-panel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver no Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/pambraga",
    );
  });

  it("renders an elegant fallback without a cover image", () => {
    render(
      <PublicLiveHero
        creator={{ ...creator, avatarUrl: null }}
        live={{ ...live, coverImageUrl: null, instagramUrl: null }}
        products={[]}
      />,
    );

    expect(screen.getByText("PB")).toBeInTheDocument();
    expect(screen.getByText("0 produtos selecionados")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ver no Instagram" }),
    ).not.toBeInTheDocument();
  });
});
