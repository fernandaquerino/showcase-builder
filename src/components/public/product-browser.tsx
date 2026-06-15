"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/server/db/queries/public-showcase";
import { PublicEmptyState } from "./public-empty-state";
import { PublicProductCard } from "./public-product-card";
import {
  deriveCategoryOptions,
  productMatchesCategory,
} from "./showcase-utils";

type ProductBrowserProps = {
  products: PublicProduct[];
};

const ALL = "Tudo";

export function ProductBrowser({ products }: ProductBrowserProps) {
  const [activeCategory, setActiveCategory] = useState(ALL);
  const categories = useMemo(() => deriveCategoryOptions(products), [products]);
  const visibleProducts = products.filter((product) =>
    productMatchesCategory(product, activeCategory),
  );

  if (products.length === 0) {
    return (
      <PublicEmptyState
        title="Os produtos desta live serão adicionados em breve."
        description="Volte em alguns instantes para conferir a vitrine completa."
      />
    );
  }

  return (
    <section aria-labelledby="products-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="products-heading" className="text-2xl font-semibold">
            Vitrine da live
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {visibleProducts.length} de {products.length} produtos
          </p>
        </div>
      </div>

      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
        aria-label="Filtrar produtos por categoria"
      >
        <Button
          type="button"
          variant={activeCategory === ALL ? "default" : "outline"}
          aria-pressed={activeCategory === ALL}
          className="min-h-11 shrink-0 rounded-full"
          onClick={() => setActiveCategory(ALL)}
        >
          Tudo ({products.length})
        </Button>
        {categories.map((category) => (
          <Button
            key={category.label}
            type="button"
            variant={activeCategory === category.label ? "default" : "outline"}
            aria-pressed={activeCategory === category.label}
            className="min-h-11 shrink-0 rounded-full"
            onClick={() => setActiveCategory(category.label)}
          >
            {category.label} ({category.count})
          </Button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <PublicEmptyState
          title="Nenhum produto nesta categoria."
          description="Escolha outra categoria ou volte para a lista completa."
          action={{
            label: "Ver todos os produtos",
            onClick: () => setActiveCategory(ALL),
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visibleProducts.map((product, index) => (
            <PublicProductCard
              key={product.id}
              product={product}
              priority={index < 2}
            />
          ))}
        </div>
      )}
    </section>
  );
}
