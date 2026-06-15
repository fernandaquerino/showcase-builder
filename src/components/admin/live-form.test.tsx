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
    render(<LiveForm mode="create" handle="pam" />);

    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Data da live")).toBeInTheDocument();
    // The cover is now an upload control, not a URL input.
    expect(screen.getByText("Imagem da live")).toBeInTheDocument();
    expect(
      screen.getByText("Adicione uma imagem para sua live"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Link do Instagram")).toBeInTheDocument();
    expect(screen.getByLabelText("Endereço da página")).toBeInTheDocument();
  });

  it("auto-generates the slug from the title while it is untouched", () => {
    render(<LiveForm mode="create" handle="pam" />);

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Looks de Inverno" },
    });

    expect(screen.getByLabelText("Endereço da página")).toHaveValue(
      "looks-de-inverno",
    );
    expect(screen.getByText("/pam/looks-de-inverno")).toBeInTheDocument();
  });

  it("stops auto-generating the slug once edited by hand", () => {
    render(<LiveForm mode="create" handle="pam" />);

    fireEvent.change(screen.getByLabelText("Endereço da página"), {
      target: { value: "meu-endereco" },
    });
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Outro título" },
    });

    expect(screen.getByLabelText("Endereço da página")).toHaveValue(
      "meu-endereco",
    );
  });

  it("prefills the fields in edit mode", () => {
    render(
      <LiveForm
        mode="edit"
        handle="pam"
        liveId="22222222-2222-4222-a222-222222222222"
        initialValues={{
          title: "Live de Inverno",
          liveDate: "2026-06-20",
          liveTime: "20:00",
          coverImageUrl: "https://cdn.exemplo.com/live.jpg",
          instagramUrl: "https://www.instagram.com/pam",
          slug: "live-de-inverno",
        }}
      />,
    );

    expect(screen.getByLabelText("Título")).toHaveValue("Live de Inverno");
    expect(screen.getByLabelText("Endereço da página")).toHaveValue(
      "live-de-inverno",
    );
    // The existing cover shows as a preview instead of a URL input.
    expect(screen.getByAltText("Prévia da capa da live")).toHaveAttribute(
      "src",
      "https://cdn.exemplo.com/live.jpg",
    );
    expect(screen.getByLabelText("Link do Instagram")).toHaveValue(
      "https://www.instagram.com/pam",
    );
  });

  it("shows a validation error for a short title", async () => {
    render(<LiveForm mode="create" handle="pam" />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    expect(
      await screen.findByText("O título deve ter pelo menos 3 caracteres."),
    ).toBeInTheDocument();
  });
});
