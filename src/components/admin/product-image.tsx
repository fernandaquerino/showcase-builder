"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

/**
 * Renders an externally-hosted product image for the admin area.
 *
 * Product image URLs are arbitrary (pasted by the creator), so we deliberately
 * use a plain `<img>` instead of `next/image`: it avoids configuring an
 * unrestricted remote-image wildcard and the optimizer proxy (a potential SSRF
 * vector) for untrusted hosts. This is an administrative preview only; the
 * public card and optimized images come in a later phase. A fixed-size box
 * prevents layout shift and an `onError` fallback keeps the card intact.
 */
export function ProductImage({ src, alt, className }: ProductImageProps) {
  // Track the source that failed instead of a boolean, so changing `src` (e.g.
  // during the live form preview) clears the fallback without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showFallback = !src || failedSrc === src;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground",
        className,
      )}
    >
      {showFallback ? (
        <span className="flex flex-col items-center gap-1 px-2 text-center text-xs">
          <ImageOff className="size-5" aria-hidden="true" />
          <span>Não foi possível carregar esta imagem.</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- untrusted external host; see component doc.
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}
