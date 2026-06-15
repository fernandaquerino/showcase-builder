import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { liveIdSchema } from "@/lib/validations/live";
import { getLiveByIdForUser } from "@/server/db/queries/lives";
import { getCategoriesByLiveIdForUser } from "@/server/db/queries/products";

export const metadata: Metadata = {
  title: "Adicionar produto",
};

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ liveId: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { liveId } = await params;

  if (!liveIdSchema.safeParse(liveId).success) {
    notFound();
  }

  const live = await getLiveByIdForUser(liveId, session.user.id);

  if (!live) {
    notFound();
  }

  const categorySuggestions = await getCategoriesByLiveIdForUser(
    live.id,
    session.user.id,
  );

  return (
    <main className="mx-auto w-full max-w-fit px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={`/admin/lives/${live.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar para {live.title}
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Adicionar produto
      </h1>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ProductForm
            mode="create"
            liveId={live.id}
            categorySuggestions={categorySuggestions}
          />
        </CardContent>
      </Card>
    </main>
  );
}
