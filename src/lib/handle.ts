const HANDLE_MAX_LENGTH = 30;

export function normalizeHandle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/[-_]+$/g, "");
}

export function getHandleSuggestion(
  name?: string | null,
  email?: string | null,
) {
  const emailLocalPart = email?.split("@")[0];
  return normalizeHandle(name || emailLocalPart || "");
}
