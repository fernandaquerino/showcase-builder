export const PUBLIC_LIVE_TIME_ZONE = "America/Sao_Paulo";
export const DEFAULT_LIVE_DURATION_MS = 2 * 60 * 60 * 1000;

export type PublicLiveState = "scheduled" | "live" | "finished" | "undated";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type LiveScheduleInput = {
  liveDate: string | null | undefined;
  liveTime: string | null | undefined;
  timeZone?: string;
};

function parseDateParts(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeParts(value: string): {
  hours: number;
  minutes: number;
} | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.slice(0, 5));
  if (!match) {
    return null;
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return asUtc - date.getTime();
}

export function combineLiveDateAndTime({
  liveDate,
  liveTime,
  timeZone = PUBLIC_LIVE_TIME_ZONE,
}: LiveScheduleInput): Date | null {
  if (!liveDate || !liveTime) {
    return null;
  }

  const date = parseDateParts(liveDate);
  const time = parseTimeParts(liveTime);
  if (!date || !time) {
    return null;
  }

  const utcGuess = new Date(
    Date.UTC(date.year, date.month - 1, date.day, time.hours, time.minutes),
  );
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offset);
}

export function getPublicLiveState(
  input: LiveScheduleInput,
  now: Date = new Date(),
  durationMs: number = DEFAULT_LIVE_DURATION_MS,
): PublicLiveState {
  const startsAt = combineLiveDateAndTime(input);

  if (!startsAt) {
    return "undated";
  }

  const startTime = startsAt.getTime();
  const nowTime = now.getTime();
  if (nowTime < startTime) {
    return "scheduled";
  }

  if (nowTime < startTime + durationMs) {
    return "live";
  }

  return "finished";
}

export function getCountdownParts(
  target: Date,
  now: Date = new Date(),
): CountdownParts {
  const diffSeconds = Math.max(
    0,
    Math.floor((target.getTime() - now.getTime()) / 1000),
  );

  const days = Math.floor(diffSeconds / 86_400);
  const hours = Math.floor((diffSeconds % 86_400) / 3_600);
  const minutes = Math.floor((diffSeconds % 3_600) / 60);
  const seconds = diffSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function formatCountdownAccessible(parts: CountdownParts): string {
  const segments = [
    parts.days > 0 ? `${parts.days} dias` : null,
    parts.hours > 0 ? `${parts.hours} horas` : null,
    parts.minutes > 0 ? `${parts.minutes} minutos` : null,
  ].filter(Boolean);

  if (segments.length === 0) {
    return "A live começa em menos de 1 minuto.";
  }

  return `A live começa em ${segments.join(", ")}.`;
}
