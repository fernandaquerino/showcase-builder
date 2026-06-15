import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
});
