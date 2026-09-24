"use client";

import { Search } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractionErrorMessage } from "@/lib/extract-messages";
import type {
  ExtractionResponse,
  ExtractionSuccessData,
} from "@/lib/validations/extract";

export type ApplyExtractionResult = { filled: number; preserved: number };

type ExtractorState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; completeness: "complete" | "partial"; preserved: number }
  | { kind: "error"; message: string };

type ProductLinkExtractorProps = {
  initialUrl?: string;
  mode: "create" | "edit";
  onApply: (data: ExtractionSuccessData) => ApplyExtractionResult;
  onUrlChange: (url: string) => void;
  onRevealForm: () => void;
};

async function requestExtraction(url: string): Promise<ExtractionResponse> {
  const response = await fetch("/api/products/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return (await response.json()) as ExtractionResponse;
}

export function ProductLinkExtractor({
  initialUrl = "",
  mode,
  onApply,
  onUrlChange,
  onRevealForm,
}: ProductLinkExtractorProps) {
  const [url, setUrl] = useState(initialUrl);
  const [state, setState] = useState<ExtractorState>({ kind: "idle" });
  const inputId = useId();
  const helpId = useId();

  async function runExtraction() {
    if (url.trim() === "") return;
    setState({ kind: "loading" });

    try {
      const result = await requestExtraction(url);
      if (!result.success) {
        setState({ kind: "error", message: result.error.message });
        return;
      }

      const { preserved } = onApply(result.data);
      setState({
        kind: "success",
        completeness: result.data.completeness,
        preserved,
      });
      onRevealForm();
    } catch {
      setState({
        kind: "error",
        message: extractionErrorMessage("EXTRACTION_FAILED"),
      });
      onRevealForm();
    }
  }

  const isLoading = state.kind === "loading";

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="space-y-4 rounded-xl border bg-muted/30 p-4 sm:p-5"
    >
      <div className="space-y-1">
        <h2 id={`${inputId}-heading`} className="text-lg font-semibold">
          Adicione um produto
        </h2>
        <p className="text-sm text-muted-foreground">
          Cole o link do produto. Vamos tentar encontrar o nome, a foto e o
          preço para você.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={inputId}>Cole o link do produto</Label>
        <Input
          id={inputId}
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={url}
          aria-describedby={helpId}
          className="min-h-11"
          onChange={(event) => {
            setUrl(event.target.value);
            onUrlChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void runExtraction();
            }
          }}
        />
        <p id={helpId} className="text-sm text-muted-foreground">
          O link será mantido para suas seguidoras comprarem por ele.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={() => void runExtraction()}
          loading={isLoading}
          loadingText="Procurando o produto..."
          disabled={url.trim() === ""}
          className="min-h-11"
        >
          <Search className="size-4" aria-hidden="true" />
          {mode === "edit" ? "Buscar informações novamente" : "Buscar produto"}
        </Button>
        {mode === "create" && (
          <Button
            type="button"
            variant="ghost"
            onClick={onRevealForm}
            disabled={isLoading}
            className="min-h-11"
          >
            Prefiro preencher manualmente
          </Button>
        )}
      </div>

      <div aria-live="polite">
        {state.kind === "success" && (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              {state.completeness === "complete"
                ? "Produto encontrado"
                : "Encontramos algumas informações"}
            </p>
            <p className="text-muted-foreground">
              {state.completeness === "complete"
                ? "Confira as informações antes de adicionar à live."
                : "Complete os campos que ainda estão vazios."}
            </p>
            {state.preserved > 0 && (
              <p className="text-muted-foreground">
                Mantivemos os campos que você já tinha preenchido.
              </p>
            )}
          </div>
        )}
      </div>

      {state.kind === "error" && (
        <div role="alert" className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            Não conseguimos encontrar os dados automaticamente
          </p>
          <p className="text-muted-foreground">{state.message}</p>
        </div>
      )}
    </section>
  );
}
