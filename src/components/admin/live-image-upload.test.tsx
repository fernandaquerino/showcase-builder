import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveImageUpload } from "./live-image-upload";

function makeFile(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function selectFile(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error("file input not found");
  }
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LiveImageUpload", () => {
  it("shows the empty dropzone when there is no value", () => {
    render(<LiveImageUpload value={null} onChange={vi.fn()} />);
    expect(
      screen.getByText("Adicione uma imagem para sua live"),
    ).toBeInTheDocument();
  });

  it("rejects a non-image type without uploading", () => {
    const onChange = vi.fn();
    render(<LiveImageUpload value={null} onChange={onChange} />);

    selectFile(makeFile("evil.svg", "image/svg+xml", 100));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A imagem deve ser JPG, PNG ou WebP.",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB without uploading", () => {
    const onChange = vi.fn();
    render(<LiveImageUpload value={null} onChange={onChange} />);

    selectFile(makeFile("big.png", "image/png", 6 * 1024 * 1024));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A imagem deve ter no máximo 5 MB.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uploads a valid image and reports the returned url", async () => {
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, url: "https://blob/cover.png" }),
    } as Response);

    render(
      <LiveImageUpload
        value={null}
        onChange={onChange}
        onUploadingChange={onUploadingChange}
      />,
    );

    selectFile(makeFile("cover.png", "image/png", 1000));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith("https://blob/cover.png"),
    );
    expect(onUploadingChange).toHaveBeenCalledWith(true);
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("surfaces a server error message", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "Falhou no servidor." }),
    } as Response);

    render(<LiveImageUpload value={null} onChange={vi.fn()} />);
    selectFile(makeFile("cover.png", "image/png", 1000));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Falhou no servidor."),
    );
  });

  it("renders a preview with change/remove actions when a value exists", () => {
    const onChange = vi.fn();
    render(
      <LiveImageUpload value="https://blob/cover.png" onChange={onChange} />,
    );

    expect(screen.getByAltText("Prévia da capa da live")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Remover imagem/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
