import { CalendarDays, Clock, Sparkles } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { formatLiveDate, formatLiveTime } from "@/lib/format";
import { parseLiveThemeConfig } from "@/lib/validations/live-theme";
import {
  combineLiveDateAndTime,
  getCountdownParts,
  getPublicLiveState,
} from "@/lib/public-live-state";
import type {
  PublicCreator,
  PublicLive,
  PublicProduct,
} from "@/server/db/queries/public-showcase";
import { LiveStatusPanel } from "./live-status-panel";

type PublicLiveHeroProps = {
  creator: PublicCreator;
  live: PublicLive | null;
  products: PublicProduct[];
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function productCountLabel(count: number): string {
  return count === 1 ? "1 produto selecionado" : `${count} produtos selecionados`;
}

export function PublicLiveHero({
  creator,
  live,
  products,
}: PublicLiveHeroProps) {
  const state = live
    ? getPublicLiveState({
        liveDate: live.liveDate,
        liveTime: live.liveTime,
      })
    : "undated";
  const startsAt = live
    ? combineLiveDateAndTime({
        liveDate: live.liveDate,
        liveTime: live.liveTime,
      })
    : null;
  const initialCountdown = startsAt
    ? getCountdownParts(startsAt)
    : { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const time = formatLiveTime(live?.liveTime ?? null);
  const theme = parseLiveThemeConfig(live?.themeConfig);
  const hasCover = Boolean(live?.coverImageUrl) && theme.heroStyle !== "clean";

  return (
    <header className="relative isolate overflow-hidden bg-[var(--live-primary)] text-[var(--live-primary-foreground)] shadow-sm">
      {hasCover ? (
        <>
          {/* Remote creator-provided image URL; keep native img to avoid an unrestricted next/image proxy. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={live?.coverImageUrl ?? ""}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/45 to-black/80" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,var(--live-primary)_0%,var(--live-background)_100%)]" />
          <div className="absolute right-6 top-10 -z-10 size-28 border border-white/10 bg-white/10 blur-sm sm:size-44" />
        </>
      )}

      <div className="mx-auto flex min-h-[560px] w-full max-w-6xl flex-col justify-end px-5 py-8 sm:min-h-[620px] sm:px-8 lg:px-10">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/12 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/15 backdrop-blur">
            <Avatar className="size-10 border border-white/25 bg-white/15">
              {creator.avatarUrl && (
                <AvatarImage
                  src={creator.avatarUrl}
                  alt={`Foto de ${creator.name}`}
                />
              )}
              <AvatarFallback className="bg-white/20 text-sm text-white">
                {initials(creator.name)}
              </AvatarFallback>
            </Avatar>
            <span>
              <span className="block leading-tight">{creator.name}</span>
              <span className="block text-xs text-white/75">
                @{creator.handle}
              </span>
            </span>
          </div>

          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              <Sparkles className="size-4" aria-hidden="true" />
              Curadoria da live
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[0.98] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {live?.title ?? `Vitrine de ${creator.name}`}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/82 sm:text-lg">
              Confira os produtos escolhidos para esta live, com links diretos
              para comprar e detalhes de tamanho, cor e preço.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-white/90">
            {live ? (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/12 px-4 ring-1 ring-white/15 backdrop-blur">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatLiveDate(live.liveDate)}
              </span>
            ) : null}
            {time ? (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/12 px-4 ring-1 ring-white/15 backdrop-blur">
                <Clock className="size-4" aria-hidden="true" />
                {time}
              </span>
            ) : null}
            <span className="inline-flex min-h-10 items-center rounded-full bg-white/12 px-4 ring-1 ring-white/15 backdrop-blur">
              {productCountLabel(products.length)}
            </span>
          </div>

          <LiveStatusPanel
            initialState={state}
            startsAtIso={startsAt?.toISOString() ?? null}
            initialCountdown={initialCountdown}
          />
        </div>
      </div>
    </header>
  );
}
