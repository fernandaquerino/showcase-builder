import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { liveIdSchema } from "@/lib/validations/live";
import {
  productIdSchema,
  type ProductFormValues,
} from "@/lib/validations/product";
import { getLiveByIdForUser } from "@/server/db/queries/lives";
import {
  getCategoriesByLiveIdForUser,
  getProductByIdForUser,
} from "@/server/db/queries/products";

export const metadata: Metadata = {
  title: "Editar produto",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ liveId: string; productId: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { liveId, productId } = await params;

  if (
    !liveIdSchema.safeParse(liveId).success ||
    !productIdSchema.safeParse(productId).success
  ) {
    notFound();
  }

  const live = await getLiveByIdForUser(liveId, session.user.id);

  if (!live) {
    notFound();
  }

  const product = await getProductByIdForUser(
    productId,
    live.id,
    session.user.id,
  );

  if (!product) {
    notFound();
  }

  const categorySuggestions = await getCategoriesByLiveIdForUser(
    live.id,
    session.user.id,
  );

  const initialValues: ProductFormValues = {
    name: product.name,
    category: product.category,
    size: product.size ?? "",
    color: product.color ?? "",
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    // Stored as a canonical decimal ("199.90"); show it in BR form for editing.
    price: product.price ? product.price.replace(".", ",") : "",
    sourceUrl: product.sourceUrl ?? "",
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={`/admin/lives/${live.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar para {live.title}
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Editar produto
      </h1>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ProductForm
            mode="edit"
            liveId={live.id}
            productId={product.id}
            initialValues={initialValues}
            categorySuggestions={categorySuggestions}
          />
        </CardContent>
      </Card>
    </main>
  );
}
