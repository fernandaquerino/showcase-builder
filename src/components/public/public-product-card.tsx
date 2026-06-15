"use client";

import { ImageOff, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBrlPrice } from "@/lib/price";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/server/db/queries/public-showcase";

type PublicProductCardProps = {
  product: PublicProduct;
  priority?: boolean;
};

export function PublicProductCard({
  product,
  priority = false,
}: PublicProductCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = failedSrc === product.imageUrl;
  const price = formatBrlPrice(product.price);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        {showFallback ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <span>Imagem indisponível</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- product URLs are creator-provided external images; no optimizer wildcard.
          <img
            src={product.imageUrl}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            onError={() => setFailedSrc(product.imageUrl)}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <Badge variant="secondary" className="w-fit rounded-full px-2.5">
          {product.category}
        </Badge>

        <div className="space-y-1">
          <h3 className="line-clamp-3 text-sm font-semibold leading-5 text-stone-950 sm:text-base sm:leading-6">
            {product.name}
          </h3>
          {(product.size || product.color) && (
            <p className="text-xs leading-5 text-muted-foreground">
              {[product.size && `Tam. ${product.size}`, product.color]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="mt-auto space-y-3">
          {price && (
            <p className="text-lg font-semibold tracking-tight text-stone-950">
              {price}
            </p>
          )}
          <Button
            asChild
            size="sm"
            className={cn("min-h-11 w-full rounded-full px-3")}
          >
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              aria-label={`Ver produto ${product.name}`}
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              Ver produto
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
