import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { liveIdSchema } from "@/lib/validations/live";
import { getLiveByIdForUser } from "@/server/db/queries/lives";

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

  redirect(`/admin/lives/${live.id}`);
}
