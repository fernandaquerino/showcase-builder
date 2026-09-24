"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  COVER_IMAGE_ACCEPT,
  COVER_IMAGE_MESSAGES,
  validateCoverImageFile,
} from "@/lib/validations/cover-image";

export type LiveImageUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Reports upload-in-progress so the form can block its submit. */
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  error?: string;
};

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/lives/cover", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json().catch(() => null)) as
    | { success: true; url: string }
    | { success: false; message: string }
    | null;

  if (!response.ok || !data || !data.success) {
    throw new Error(data && !data.success ? data.message : COVER_IMAGE_MESSAGES.uploadFailed);
  }
  return data.url;
}

export function LiveImageUpload({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
  error,
}: LiveImageUploadProps) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const statusId = useId();
  const errorId = useId();

  const isUploading = state.kind === "uploading";
  const localError = state.kind === "error" ? state.message : undefined;
  const shownError = error ?? localError;

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const validationError = validateCoverImageFile(file);
    if (validationError) {
      setState({ kind: "error", message: COVER_IMAGE_MESSAGES[validationError] });
      return;
    }

    setState({ kind: "uploading" });
    onUploadingChange?.(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
      setState({ kind: "success" });
      onUploadingChange?.(false);
    } catch (uploadError) {
      setState({
        kind: "error",
        message:
          uploadError instanceof Error
            ? uploadError.message
            : COVER_IMAGE_MESSAGES.uploadFailed,
      });
    }
  }

  function handleRemove() {
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={COVER_IMAGE_ACCEPT}
        className="sr-only"
        disabled={disabled || isUploading}
        aria-describedby={helpId}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {value ? (
        <div className="space-y-3">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/external cover URL, no optimizer wildcard. */}
            <img
              src={value}
              alt="Prévia da capa da live"
              className="size-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={openPicker}
              disabled={disabled || isUploading}
              loading={isUploading}
              loadingText="Enviando imagem..."
              className="min-h-11"
            >
              <Upload className="size-4" aria-hidden="true" />
              Trocar imagem
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="min-h-11"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remover imagem
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isUploading}
          aria-describedby={helpId}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">
            {isUploading ? "Enviando imagem..." : "Adicione uma imagem para sua live"}
          </span>
          <span className="text-sm text-muted-foreground">
            JPG, PNG ou WebP de até 5 MB.
          </span>
          <span className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Escolher imagem
          </span>
        </button>
      )}

      <p id={helpId} className="text-sm text-muted-foreground">
        Escolha uma imagem para representar sua live na vitrine e nos
        compartilhamentos.
      </p>

      <p id={statusId} className="sr-only" aria-live="polite">
        {state.kind === "uploading"
          ? "Enviando imagem..."
          : state.kind === "success"
            ? "Imagem enviada."
            : ""}
      </p>

      {shownError && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {shownError}
        </p>
      )}
    </div>
  );
}
