"use client";

import { ArrowDown, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_LIVE_DURATION_MS,
  formatCountdownAccessible,
  getCountdownParts,
  type CountdownParts,
  type PublicLiveState,
} from "@/lib/public-live-state";
import { cn } from "@/lib/utils";

type LiveStatusPanelProps = {
  initialState: PublicLiveState;
  startsAtIso: string | null;
  initialCountdown: CountdownParts;
};

const stateLabel: Record<PublicLiveState, string> = {
  scheduled: "Live agendada",
  live: "Ao vivo agora",
  finished: "Produtos da live",
  undated: "Confira os produtos selecionados",
};

const ctaLabel: Record<PublicLiveState, string> = {
  scheduled: "Ver produtos da live",
  live: "Ver produtos agora",
  finished: "Confira os produtos",
  undated: "Ver produtos",
};

function resolveState(startsAt: Date | null, now: Date): PublicLiveState {
  if (!startsAt) {
    return "undated";
  }

  const start = startsAt.getTime();
  const current = now.getTime();

  if (current < start) {
    return "scheduled";
  }

  if (current < start + DEFAULT_LIVE_DURATION_MS) {
    return "live";
  }

  return "finished";
}

function CountdownValue({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="flex min-w-14 flex-col items-center gap-1 rounded-[var(--live-radius)] bg-white/85 px-2 py-2 text-stone-950 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <span className="font-mono text-2xl font-semibold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[0.68rem] font-medium uppercase tracking-wide text-stone-500">
        {label}
      </span>
    </span>
  );
}

function LiveCountdown({ parts }: { parts: CountdownParts }) {
  const accessibleText = formatCountdownAccessible(parts);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white/85">A live começa em</p>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        <CountdownValue value={parts.days} label="dias" />
        <CountdownValue value={parts.hours} label="horas" />
        <CountdownValue value={parts.minutes} label="min" />
        <CountdownValue value={parts.seconds} label="seg" />
      </div>
      <p className="sr-only">{accessibleText}</p>
    </div>
  );
}

export function LiveStatusPanel({
  initialState,
  startsAtIso,
  initialCountdown,
}: LiveStatusPanelProps) {
  const startsAt = useMemo(
    () => (startsAtIso ? new Date(startsAtIso) : null),
    [startsAtIso],
  );
  const [state, setState] = useState(initialState);
  const [countdown, setCountdown] =
    useState<CountdownParts>(initialCountdown);

  useEffect(() => {
    if (!startsAt || (state !== "scheduled" && state !== "live")) {
      return;
    }

    const target = startsAt;

    function update() {
      const now = new Date();
      const nextState = resolveState(target, now);
      setState(nextState);

      if (nextState === "scheduled") {
        setCountdown(getCountdownParts(target, now));
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }

    update();
    const interval = window.setInterval(update, state === "scheduled" ? 1000 : 60_000);

    return () => window.clearInterval(interval);
  }, [startsAt, state]);

  return (
    <div className="space-y-5">
      {/* <div
        className="inline-flex min-h-10 items-center gap-2 rounded-[var(--live-radius)] bg-white/90 px-4 text-sm font-semibold text-stone-950 shadow-sm ring-1 ring-black/5"
        aria-live="polite"
      >
        <Radio
          className={cn(
            "size-4",
            state === "live" ? "text-red-600" : "text-[var(--live-primary)]",
          )}
          aria-hidden="true"
        />
        {stateLabel[state]}
      </div> */}

      {state === "scheduled" && startsAt ? (
        <LiveCountdown parts={countdown} />
      ) : null}

      {/* <Button
        asChild
        size="lg"
        className="min-h-12 rounded-[var(--live-radius)] bg-[var(--live-primary)] px-6 text-[var(--live-primary-foreground)] shadow-sm motion-safe:scroll-smooth"
      >
        <a href="#produtos">
          {ctaLabel[state]}
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </Button> */}
    </div>
  );
}
