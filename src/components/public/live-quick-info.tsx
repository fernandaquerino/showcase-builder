import { CalendarDays, Clock, PackageCheck, UserRound } from "lucide-react";

import { formatLiveDate, formatLiveTime } from "@/lib/format";
import type {
  PublicCreator,
  PublicLive,
} from "@/server/db/queries/public-showcase";

type LiveQuickInfoProps = {
  creator: PublicCreator;
  live: PublicLive;
  productCount: number;
};

type QuickInfoItem = {
  label: string;
  value: string;
  icon: typeof CalendarDays;
};

function isQuickInfoItem(item: QuickInfoItem | null): item is QuickInfoItem {
  return item !== null;
}

function productCountLabel(count: number): string {
  return count === 1 ? "1 produto" : `${count} produtos`;
}

export function LiveQuickInfo({
  creator,
  live,
  productCount,
}: LiveQuickInfoProps) {
  const time = formatLiveTime(live.liveTime);
  const items = [
    {
      label: "Data",
      value: formatLiveDate(live.liveDate),
      icon: CalendarDays,
    },
    time
      ? {
          label: "Horário",
          value: time,
          icon: Clock,
        }
      : null,
    {
      label: "Curadoria",
      value: `@${creator.handle}`,
      icon: UserRound,
    },
    {
      label: "Vitrine",
      value: productCountLabel(productCount),
      icon: PackageCheck,
    },
  ].filter(isQuickInfoItem);

  return (
    <section
      aria-label="Informações principais da live"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-stone-200/70 backdrop-blur"
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {item.value}
            </p>
          </div>
        );
      })}
    </section>
  );
}
