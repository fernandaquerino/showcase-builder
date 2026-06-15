/**
 * Formats a `YYYY-MM-DD` date string (the `live_date` column shape) as
 * `DD/MM/YYYY` without going through the `Date` constructor, so the rendered
 * day never shifts because of the server/client timezone.
 */
export function formatLiveDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Formats an `HH:mm` time string for display, returning `null` when absent.
 */
export function formatLiveTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 5);
}

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/**
 * Formats an absolute timestamp (e.g. `updated_at`) in Brazilian format using a
 * fixed timezone so the server and client render the same string.
 */
export function formatTimestamp(value: Date): string {
  return UPDATED_AT_FORMATTER.format(value);
}
