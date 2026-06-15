"use client";

import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildWhatsAppShareUrl } from "./showcase-utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { PublicCreator } from "@/server/db/queries/public-showcase";

type CopyState = "idle" | "success" | "error";

type ShareShowcaseProps = {
  url: string;
  creator: PublicCreator;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ShareShowcase({ url, creator }: ShareShowcaseProps) {
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

  async function shareLink() {
    try {
      if (!navigator.share) {
        await copyLink();
        return;
      }

      await navigator.share({
        title: "Vitrine da live",
        text: "Olha os produtos desta live.",
        url,
      });
      setCopyState("idle");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section
      aria-labelledby="share-heading"
      className="overflow-hidden rounded-3xl bg-stone-950 text-white shadow-sm"
    >
      <div className="relative p-6 sm:p-8">
        <div className="absolute right-5 top-5 hidden sm:block">
          <Avatar className="size-12 border bg-secondary">
            {creator.avatarUrl && (
              <AvatarImage
                src={creator.avatarUrl}
                alt={`Foto de ${creator.name}`}
              />
            )}
            <AvatarFallback>{initials(creator.name)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="relative max-w-2xl space-y-2">
          <div className="inline-flex size-10 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15">
            <Share2 className="size-5" aria-hidden="true" />
          </div>
          <h2 id="share-heading" className="text-2xl font-semibold tracking-tight">
            Gostou das escolhas?
          </h2>
          <p className="text-sm leading-6 text-white/75">
            Compartilhe esta vitrine com uma amiga para ela conferir os links da
            live também.
          </p>
        </div>

        <div className="relative mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-12 rounded-full bg-white text-stone-950 hover:bg-white/90"
            onClick={() => void shareLink()}
          >
            <Share2 className="size-4" aria-hidden="true" />
            Compartilhar
          </Button>
          <Button
            asChild
            className="min-h-12 rounded-full bg-white text-stone-950 hover:bg-white/90"
          >
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
            className="min-h-12 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => void copyLink()}
          >
            <Copy className="size-4" aria-hidden="true" />
            {copyState === "success" ? "Link copiado" : "Copiar link"}
          </Button>
        </div>

        <p className="relative mt-3 min-h-5 text-sm text-white/70" aria-live="polite">
          {copyState === "error" && "Não foi possível copiar."}
          {copyState === "success" && "O link está pronto para colar."}
        </p>
      </div>
    </section>
  );
}
