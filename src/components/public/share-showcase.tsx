"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildWhatsAppShareUrl } from "./showcase-utils";

type CopyState = "idle" | "success" | "error";

type ShareShowcaseProps = {
  url: string;
};

export function ShareShowcase({ url }: ShareShowcaseProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable.");
      }

      await navigator.clipboard.writeText(url);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section
      aria-labelledby="share-heading"
      className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="share-heading" className="text-xl font-semibold">
          Gostou das escolhas?
        </h2>
        <p className="text-sm text-muted-foreground">
          Compartilhe esta vitrine com uma amiga.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="min-h-11">
          <a
            href={buildWhatsAppShareUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Compartilhar no WhatsApp
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => void copyLink()}
        >
          <Copy className="size-4" aria-hidden="true" />
          {copyState === "success" ? "Link copiado" : "Copiar link"}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {copyState === "error" && "Não foi possível copiar."}
        {copyState === "success" && "O link está pronto para colar."}
      </p>
    </section>
  );
}
