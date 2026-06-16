import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BulkProductImportPage } from "@/components/admin/bulk-import/bulk-product-import-page";
import { CompactLiveSummaryCard } from "@/components/admin/compact-live-summary-card";
import { DeleteLiveDialog } from "@/components/admin/delete-live-dialog";
import { LiveStatusBadge } from "@/components/admin/live-status-badge";
import { ProductsSection } from "@/components/admin/products-section";
import { PublishControl } from "@/components/admin/publish-control";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getExtractionConfig } from "@/lib/env";
import { normalizeUrlForComparison } from "@/lib/url";
import { liveIdSchema, type LiveFormValues } from "@/lib/validations/live";
import { getLiveByIdForUser } from "@/server/db/queries/lives";
import { getProductsByLiveIdForUser } from "@/server/db/queries/products";

export const metadata: Metadata = {
  title: "Editar live",
};

export default async function EditLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ liveId: string }>;
  searchParams: Promise<{ created?: string }>;
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

  const products = await getProductsByLiveIdForUser(live.id, session.user.id);
  const created = (await searchParams).created === "1";
  const existingUrlKeys = products
    .map((product) => normalizeUrlForComparison(product.productUrl))
    .filter((key): key is string => key !== null);
  const allowedHosts = Array.from(getExtractionConfig().allowedHosts);

  const initialValues: LiveFormValues = {
    title: live.title,
    liveDate: live.liveDate,
    liveTime: live.liveTime ?? "",
    coverImageUrl: live.coverImageUrl ?? "",
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar para suas lives
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Editar live</h1>
          <LiveStatusBadge status={live.status} />
        </div>
        <PublishControl liveId={live.id} status={live.status} />
      </div>

      {created ? (
        <Alert className="mt-6">
          <AlertDescription>
            Live criada. Agora adicione os produtos que serão mostrados.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ProductsSection liveId={live.id} products={products} />
        </CardContent>
      </Card>

      <div className="mt-6">
        <BulkProductImportPage
          liveId={live.id}
          allowedHosts={allowedHosts}
          existingUrlKeys={existingUrlKeys}
        />
      </div>

      <div className="mt-6">
        <CompactLiveSummaryCard
          live={live}
          productCount={products.length}
          initialValues={initialValues}
        />
      </div>

      <Card className="mt-6 border-destructive/30">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Excluir live</CardTitle>
            <CardDescription>
              Remove esta live permanentemente. Não poderá ser desfeito.
            </CardDescription>
          </div>
          <DeleteLiveDialog
            liveId={live.id}
            title={live.title}
            status={live.status}
            redirectToAdmin
            trigger={
              <Button variant="destructive" size="sm">
                Excluir
              </Button>
            }
          />
        </CardHeader>
      </Card>
    </main>
  );
}
