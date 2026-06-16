import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LiveForm } from "./live-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/server/actions/lives", () => ({
  createLiveAction: vi.fn(),
  updateLiveAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("LiveForm", () => {
  it("renders the core fields in create mode", () => {
    render(<LiveForm mode="create" />);

    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Data da live")).toBeInTheDocument();
    // The cover is now an upload control, not a URL input.
    expect(screen.getByText("Imagem da live")).toBeInTheDocument();
    expect(
      screen.getByText("Adicione uma imagem para sua live"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Link do Instagram")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Endereço da página")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /gerar do título/i }),
    ).not.toBeInTheDocument();
  });

  it("prefills the fields in edit mode", () => {
    render(
      <LiveForm
        mode="edit"
        liveId="22222222-2222-4222-a222-222222222222"
        initialValues={{
          title: "Live de Inverno",
          liveDate: "2026-06-20",
          liveTime: "20:00",
          coverImageUrl: "https://cdn.exemplo.com/live.jpg",
        }}
      />,
    );

    expect(screen.getByLabelText("Título")).toHaveValue("Live de Inverno");
    // The existing cover shows as a preview instead of a URL input.
    expect(screen.getByAltText("Prévia da capa da live")).toHaveAttribute(
      "src",
      "https://cdn.exemplo.com/live.jpg",
    );
  });

  it("shows a validation error for a short title", async () => {
    render(<LiveForm mode="create" />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    expect(
      await screen.findByText("O título deve ter pelo menos 3 caracteres."),
    ).toBeInTheDocument();
  });
});
