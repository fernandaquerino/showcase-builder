export function capitalizeFirst(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toLocaleUpperCase("pt-BR") + normalized.slice(1);
}
