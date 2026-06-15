import type { PublicProduct } from "@/server/db/queries/public-showcase";

export type CategoryOption = {
  label: string;
  count: number;
};

export function deriveCategoryOptions(
  products: Pick<PublicProduct, "category">[],
): CategoryOption[] {
  const byKey = new Map<string, CategoryOption>();

  for (const product of products) {
    const label = product.category.replace(/\s+/g, " ").trim();
    if (!label) continue;

    const key = label.toLocaleLowerCase("pt-BR");
    const current = byKey.get(key);
    if (current) {
      current.count += 1;
    } else {
      byKey.set(key, { label, count: 1 });
    }
  }

  return [...byKey.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR", { sensitivity: "base" }),
  );
}

export function productMatchesCategory(
  product: Pick<PublicProduct, "category">,
  category: string,
): boolean {
  return (
    category === "Tudo" ||
    product.category.toLocaleLowerCase("pt-BR") ===
      category.toLocaleLowerCase("pt-BR")
  );
}

export function buildWhatsAppShareUrl(url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(
    `Olha os produtos desta live: ${url}`,
  )}`;
}

export function productCtaLabel(store: string): string {
  return store.trim().toLocaleLowerCase("pt-BR").includes("c&a")
    ? "Ver na C&A"
    : "Ver produto";
}
