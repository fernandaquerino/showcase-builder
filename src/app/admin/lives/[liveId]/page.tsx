import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteLiveDialog } from "@/components/admin/delete-live-dialog";
import { LiveForm } from "@/components/admin/live-form";
import { LiveStatusBadge } from "@/components/admin/live-status-badge";
import { ProductsSection } from "@/components/admin/products-section";
import { PublishControl } from "@/components/admin/publish-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { liveIdSchema, type LiveFormValues } from "@/lib/validations/live";
import { getLiveByIdForUser } from "@/server/db/queries/lives";
import { getProductsByLiveIdForUser } from "@/server/db/queries/products";

export const metadata: Metadata = {
  title: "Editar live",
};

export default async function EditLivePage({
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

  const products = await getProductsByLiveIdForUser(live.id, session.user.id);

  const initialValues: LiveFormValues = {
    title: live.title,
    // subtitle: live.subtitle ?? "",
    // store: live.store,
    liveDate: live.liveDate,
    liveTime: live.liveTime ?? "",
    // platform: live.platform ?? "",
    coverImageUrl: live.coverImageUrl ?? "",
    instagramUrl: live.instagramUrl ?? "",
    slug: live.slug,
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
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

      <Card className="mt-6">
        <CardContent className="pt-6">
          <LiveForm
            mode="edit"
            handle={session.user.handle}
            liveId={live.id}
            initialValues={initialValues}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ProductsSection liveId={live.id} products={products} />
        </CardContent>
      </Card>

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
