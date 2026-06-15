import { Plus } from "lucide-react";
import Link from "next/link";

import { ProductList } from "@/components/admin/product-list";
import { ProductsEmptyState } from "@/components/admin/products-empty-state";
import type { ProductCardData } from "@/components/admin/sortable-product-card";
import { Button } from "@/components/ui/button";
import type { Product } from "@/server/db/queries/products";

function toCardData(product: Product): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    size: product.size,
    color: product.color,
    imageUrl: product.imageUrl,
    price: product.price,
  };
}

export function ProductsSection({
  liveId,
  products,
}: {
  liveId: string;
  products: Product[];
}) {
  const count = products.length;

  return (
    <section aria-labelledby="products-heading" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 id="products-heading" className="text-xl font-semibold">
              Produtos da live
            </h2>
            {count > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {count}
              </span>
            )}
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Adicione as peças que você vai mostrar. Depois, arraste para
            organizar a ordem.
          </p>
        </div>

        {count > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href={`/admin/lives/${liveId}/products/import`}>
                <Plus className="size-4" aria-hidden="true" />
                Adicionar produtos
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/admin/lives/${liveId}/products/new`}>
                Adicionar apenas um produto
              </Link>
            </Button>
          </div>
        )}
      </div>

      {count === 0 ? (
        <ProductsEmptyState liveId={liveId} />
      ) : (
        <ProductList liveId={liveId} products={products.map(toCardData)} />
      )}
    </section>
  );
}
