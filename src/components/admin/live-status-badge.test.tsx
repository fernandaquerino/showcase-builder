import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveStatusBadge } from "./live-status-badge";

describe("LiveStatusBadge", () => {
  it("communicates the published status with text", () => {
    render(<LiveStatusBadge status="published" />);
    expect(screen.getByText("Publicada")).toBeInTheDocument();
  });

  it("communicates the draft status with text", () => {
    render(<LiveStatusBadge status="draft" />);
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
  });
});
