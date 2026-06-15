const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#\d+|#x[\da-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      const normalized = entity.toLowerCase();

      if (normalized.startsWith("#x")) {
        const codePoint = Number.parseInt(normalized.slice(2), 16);
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match;
      }

      if (normalized.startsWith("#")) {
        const codePoint = Number.parseInt(normalized.slice(1), 10);
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match;
      }

      return HTML_ENTITIES[normalized] ?? match;
    },
  );
}

export function capitalizeFirst(value: string): string {
  const normalized = decodeHtmlEntities(value).trim();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toLocaleUpperCase("pt-BR") + normalized.slice(1);
}
