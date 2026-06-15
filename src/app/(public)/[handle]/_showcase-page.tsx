import type { Metadata } from "next";
import { CalendarDays, Clock, Store, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductBrowser } from "@/components/public/product-browser";
import { PublicEmptyState } from "@/components/public/public-empty-state";
import { ShareShowcase } from "@/components/public/share-showcase";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLiveDate, formatLiveTime } from "@/lib/format";
import { normalizeHandle } from "@/lib/handle";
import { slugify } from "@/lib/slug";
import {
  getCachedPublishedShowcaseByHandle,
  getPublishedShowcaseByHandle,
  type PublicShowcase,
} from "@/server/db/queries/public-showcase";

export type PublicShowcaseRouteParams = {
  handle: string;
  slug?: string;
};

function publicUrl(handle: string, slug?: string): string {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";
  return new URL(slug ? `/${handle}/${slug}` : `/${handle}`, base).href;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function assertValidHandle(handle: string): string {
  const normalized = normalizeHandle(handle);
  if (!normalized || normalized !== handle) {
    notFound();
  }
  return normalized;
}

function assertValidSlug(slug?: string): string | undefined {
  if (!slug) {
    return undefined;
  }

  const normalized = slugify(slug);
  if (normalized !== slug) {
    notFound();
  }

  return normalized;
}

function metadataForShowcase(
  showcase: PublicShowcase,
  url: string,
): Metadata {
  if (!showcase.live) {
    return {
      title: `${showcase.creator.name} | Novidades em breve`,
      description: "Esta criadora ainda não publicou uma vitrine.",
      alternates: { canonical: url },
      robots: { index: true, follow: true },
      openGraph: {
        title: `${showcase.creator.name} | Novidades em breve`,
        description: "Esta criadora ainda não publicou uma vitrine.",
        url,
        type: "website",
      },
      twitter: { card: "summary_large_image" },
    };
  }

  const title = `Live ${showcase.live.store} da ${showcase.creator.name} | Produtos escolhidos`;
  const description =
    showcase.live.subtitle ??
    "Confira os produtos, tamanhos, cores e links de compra apresentados nesta live.";
  const image = showcase.products.find((product) => product.imageUrl)?.imageUrl;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: image ? [{ url: image, alt: showcase.live.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export async function generatePublicShowcaseMetadata({
  handle,
  slug,
}: PublicShowcaseRouteParams): Promise<Metadata> {
  const normalizedHandle = assertValidHandle(handle);
  const normalizedSlug = assertValidSlug(slug);
  const showcase = await getPublishedShowcaseByHandle(
    normalizedHandle,
    normalizedSlug,
  );

  if (!showcase) {
    return {
      title: "Vitrine não encontrada",
      robots: { index: false, follow: false },
    };
  }

  const canonicalSlug = normalizedSlug ?? showcase.live?.slug;
  return metadataForShowcase(
    showcase,
    publicUrl(normalizedHandle, canonicalSlug),
  );
}

function LiveInfo({ showcase }: { showcase: PublicShowcase }) {
  const live = showcase.live;

  if (!live) {
    return null;
  }

  return (
    <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
      <span className="inline-flex items-center gap-2">
        <Store className="size-4" aria-hidden="true" />
        {live.store}
      </span>
      <span className="inline-flex items-center gap-2">
        <CalendarDays className="size-4" aria-hidden="true" />
        {formatLiveDate(live.liveDate)}
      </span>
      {live.liveTime && (
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4" aria-hidden="true" />
          {formatLiveTime(live.liveTime)}
        </span>
      )}
      {live.platform && (
        <span className="inline-flex items-center gap-2">
          <Video className="size-4" aria-hidden="true" />
          {live.platform}
        </span>
      )}
    </div>
  );
}

export async function PublicShowcasePageContent({
  handle,
  slug,
}: PublicShowcaseRouteParams) {
  const normalizedHandle = assertValidHandle(handle);
  const normalizedSlug = assertValidSlug(slug);
  const showcase = await getCachedPublishedShowcaseByHandle(
    normalizedHandle,
    normalizedSlug,
  );

  if (!showcase) {
    notFound();
  }

  const shareUrl = publicUrl(normalizedHandle, showcase.live?.slug);

  return (
    <main className="min-h-screen bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="rounded-[2rem] border bg-card p-5 shadow-sm sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Avatar className="size-20 border bg-secondary">
              {showcase.creator.avatarUrl && (
                <AvatarImage
                  src={showcase.creator.avatarUrl}
                  alt={`Foto de ${showcase.creator.name}`}
                />
              )}
              <AvatarFallback className="text-xl">
                {initials(showcase.creator.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                @{showcase.creator.handle}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                {showcase.live?.title ?? showcase.creator.name}
              </h1>
              {showcase.live?.subtitle && (
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  {showcase.live.subtitle}
                </p>
              )}
              {showcase.live?.platform && (
                <Badge variant="secondary" className="mt-4">
                  Produtos da live no {showcase.live.platform}
                </Badge>
              )}
            </div>
          </div>

          <LiveInfo showcase={showcase} />
        </header>

        <div id="conteudo" className="mt-8 space-y-8">
          {!showcase.live ? (
            <PublicEmptyState
              title="Novidades em breve"
              description="Esta criadora ainda não publicou uma vitrine."
            />
          ) : (
            <>
              <ProductBrowser
                products={showcase.products}
                store={showcase.live.store}
              />
              <ShareShowcase url={shareUrl} />
            </>
          )}
        </div>

        <footer className="py-8 text-center text-sm text-muted-foreground">
          <p>Vitrine criada com Live Showcase Builder.</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/">Criar minha vitrine</Link>
          </Button>
        </footer>
      </div>
    </main>
  );
}
