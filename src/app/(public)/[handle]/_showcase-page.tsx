import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";

import { CreatorFooter } from "@/components/public/creator-footer";
import { LiveQuickInfo } from "@/components/public/live-quick-info";
import { ProductBrowser } from "@/components/public/product-browser";
import { PublicEmptyState } from "@/components/public/public-empty-state";
import { PublicLiveHero } from "@/components/public/public-live-hero";
import { ShareShowcase } from "@/components/public/share-showcase";
import { formatLiveDate, formatLiveTime } from "@/lib/format";
import { normalizeHandle } from "@/lib/handle";
import { getLiveThemeCssVariables } from "@/lib/live-theme";
import { getPublicLiveState } from "@/lib/public-live-state";
import { buildPublicUrl } from "@/lib/public-url";
import { slugify } from "@/lib/slug";
import { parseLiveThemeConfig } from "@/lib/validations/live-theme";
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
  return buildPublicUrl(slug ? `/${handle}/${slug}` : `/${handle}`);
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

  const state = getPublicLiveState({
    liveDate: showcase.live.liveDate,
    liveTime: showcase.live.liveTime,
  });
  const title = `${showcase.live.title} | ${showcase.creator.name}`;
  const time = formatLiveTime(showcase.live.liveTime);
  const scheduledDescription = time
    ? `Live agendada para ${formatLiveDate(showcase.live.liveDate)} às ${time}.`
    : `Live agendada para ${formatLiveDate(showcase.live.liveDate)}.`;
  const description =
    state === "scheduled"
      ? scheduledDescription
      : "Confira os produtos apresentados nesta live.";
  const image =
    showcase.live.coverImageUrl ??
    showcase.products.find((product) => product.imageUrl)?.imageUrl;

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
      images: image
        ? [{ url: image, alt: `Capa da live ${showcase.live.title}` }]
        : undefined,
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
  const theme = parseLiveThemeConfig(showcase.live?.themeConfig);
  const themeStyle = getLiveThemeCssVariables(theme) as CSSProperties;

  return (
    <main
      className="min-h-screen bg-[var(--live-background)] font-[family-name:var(--live-font-family)] text-[var(--live-foreground)]"
      style={themeStyle}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <PublicLiveHero
        creator={showcase.creator}
        live={showcase.live}
        products={showcase.products}
      />

      <div
        id="conteudo"
        className="mx-auto w-full max-w-6xl space-y-10 px-5 py-8 sm:px-8 sm:py-12 lg:px-10"
      >
        {showcase.live ? (
          <LiveQuickInfo
            creator={showcase.creator}
            live={showcase.live}
            productCount={showcase.products.length}
          />
        ) : null}

        <div className="space-y-10">
          {!showcase.live ? (
            <PublicEmptyState
              title="Novidades em breve"
              description="Esta criadora ainda não publicou uma vitrine."
            />
          ) : (
            <>
          <ProductBrowser
            products={showcase.products}
            theme={theme}
          />
              <ShareShowcase url={shareUrl} creator={showcase.creator} />
            </>
          )}
        </div>

        <CreatorFooter creator={showcase.creator} />
      </div>
    </main>
  );
}
