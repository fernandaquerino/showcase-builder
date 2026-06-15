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
  onApply: (data: ExtractionSuccessData) => ApplyExtractionResult;
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
  onApply,
}: ProductLinkExtractorProps) {
  const [url, setUrl] = useState(initialUrl);
  const [state, setState] = useState<ExtractorState>({ kind: "idle" });
  const inputId = useId();
  const helpId = useId();

  async function runExtraction() {
    const trimmed = url.trim();
    if (trimmed === "" || state.kind === "loading") {
      return;
    }

    setState({ kind: "loading" });

    try {
      const result = await requestExtraction(trimmed);

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
    } catch {
      setState({
        kind: "error",
        message: extractionErrorMessage("EXTRACTION_FAILED"),
      });
    }
  }

  const isLoading = state.kind === "loading";

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="space-y-3 rounded-xl border bg-muted/30 p-4"
    >
      <div className="space-y-1">
        <h3 id={`${inputId}-heading`} className="font-medium">
          Comece pelo link do produto
        </h3>
        <p className="text-sm text-muted-foreground">
          Cole o link da peça. Vamos tentar preencher o nome, a foto e o preço
          para você.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={inputId}>Link do produto</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={url}
            aria-describedby={helpId}
            disabled={isLoading}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runExtraction();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void runExtraction()}
            loading={isLoading}
            loadingText="Procurando nome e foto..."
            disabled={url.trim() === ""}
            className="shrink-0"
          >
            <Search className="size-4" aria-hidden="true" />
            Buscar informações
          </Button>
        </div>
        <p id={helpId} className="text-sm text-muted-foreground">
          Você confere e edita tudo antes de salvar.
        </p>
      </div>

      <div aria-live="polite">
        {state.kind === "success" && (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              {state.completeness === "complete"
                ? "Informações encontradas"
                : "Encontramos parte das informações"}
            </p>
            <p className="text-muted-foreground">
              {state.completeness === "complete"
                ? "Preenchemos alguns campos para você. Confira antes de salvar."
                : "Complete os campos que ainda estão vazios."}
            </p>
            {state.preserved > 0 && (
              <p className="text-muted-foreground">
                Alguns campos que você já havia preenchido foram mantidos.
              </p>
            )}
          </div>
        )}
      </div>

      {state.kind === "error" && (
        <div role="alert" className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            Não conseguimos preencher automaticamente
          </p>
          <p className="text-muted-foreground">{state.message}</p>
        </div>
      )}
    </section>
  );
}
