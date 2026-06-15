import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { loginAction } from "@/server/actions/auth/login";
import { LoginForm } from "./login-form";

vi.mock("@/server/actions/auth/login", () => ({
  loginAction: vi.fn(),
}));

describe("LoginForm", () => {
  it("renders the fields and displays validation errors", async () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("Informe um e-mail válido."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Informe sua senha.")).toBeInTheDocument();
  });

  it("passes a safe callback URL to the login action", async () => {
    vi.mocked(loginAction).mockResolvedValue({ success: false, message: "Erro" });
    render(<LoginForm callbackUrl="/admin/lives/new?from=login" />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senhaforte" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Erro")).toBeInTheDocument();
    expect(loginAction).toHaveBeenCalledWith(
      { email: "ana@example.com", password: "senhaforte" },
      "/admin/lives/new?from=login",
    );
  });
});
