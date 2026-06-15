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
        description="A vitrine já está no ar. Volte em instantes para conferir os links escolhidos pela criadora."
      />
    );
  }

  return (
    <section id="produtos" aria-labelledby="products-heading" className="space-y-6 scroll-mt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Vitrine
          </p>
          <h2
            id="products-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Produtos escolhidos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {visibleProducts.length} de {products.length} produtos
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-5 border-y border-stone-200/70 bg-stone-50/88 px-5 py-3 backdrop-blur sm:top-2 sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div
          className="flex gap-2 overflow-x-auto pb-1 sm:pb-0"
          aria-label="Filtrar produtos por categoria"
        >
          <Button
            type="button"
            variant={activeCategory === ALL ? "default" : "outline"}
            aria-pressed={activeCategory === ALL}
            className="min-h-11 shrink-0 rounded-full px-5"
            onClick={() => setActiveCategory(ALL)}
          >
            Tudo <span className="ml-1 opacity-75">{products.length}</span>
          </Button>
          {categories.map((category) => (
            <Button
              key={category.label}
              type="button"
              variant={activeCategory === category.label ? "default" : "outline"}
              aria-pressed={activeCategory === category.label}
              className="min-h-11 shrink-0 rounded-full px-5"
              onClick={() => setActiveCategory(category.label)}
            >
              {category.label}
              <span className="ml-1 opacity-75">{category.count}</span>
            </Button>
          ))}
        </div>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
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
