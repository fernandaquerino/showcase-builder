import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveEmptyState } from "./live-empty-state";

describe("LiveEmptyState", () => {
  it("shows a friendly title and a working CTA", () => {
    render(<LiveEmptyState />);

    expect(screen.getByText("Nenhuma live por aqui ainda")).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: "Criar primeira live" });
    expect(cta).toHaveAttribute("href", "/admin/lives/new");
  });
});
