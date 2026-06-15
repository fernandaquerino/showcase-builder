import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BulkProductImportPage } from "@/components/admin/bulk-import/bulk-product-import-page";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getExtractionConfig } from "@/lib/env";
import { normalizeUrlForComparison } from "@/lib/url";
import { liveIdSchema } from "@/lib/validations/live";
import { getLiveByIdForUser } from "@/server/db/queries/lives";
import { getProductsByLiveIdForUser } from "@/server/db/queries/products";

export const metadata: Metadata = {
  title: "Adicionar produtos",
};

export default async function ImportProductsPage({
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

  const existingProducts = await getProductsByLiveIdForUser(
    live.id,
    session.user.id,
  );
  const existingUrlKeys = existingProducts
    .map((product) => normalizeUrlForComparison(product.productUrl))
    .filter((key): key is string => key !== null);

  // The allowlist isn't a secret (it ships in .env.example), so it's safe to
  // hand to the client for parsing — the extract route still enforces it.
  const allowedHosts = Array.from(getExtractionConfig().allowedHosts);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={`/admin/lives/${live.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar para {live.title}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Adicionar produtos
        </h1>
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={`/admin/lives/${live.id}/products/new`}>
            Adicionar apenas um produto
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <BulkProductImportPage
          liveId={live.id}
          allowedHosts={allowedHosts}
          existingUrlKeys={existingUrlKeys}
        />
      </div>
    </main>
  );
}
