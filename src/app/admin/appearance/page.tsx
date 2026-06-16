import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LiveAppearanceSection } from "@/components/admin/live-appearance-section";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { parseLiveThemeConfig } from "@/lib/validations/live-theme";
import { getLivesByUserId } from "@/server/db/queries/lives";
import { getProductsByLiveIdForUser } from "@/server/db/queries/products";
import { getUserThemeConfig } from "@/server/db/queries/users";

export const metadata: Metadata = {
  title: "Aparência da vitrine",
};

export default async function AccountAppearancePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [userThemeConfig, lives] = await Promise.all([
    getUserThemeConfig(session.user.id),
    getLivesByUserId(session.user.id),
  ]);
  const previewLive =
    lives.find((live) => live.status === "published") ?? lives[0] ?? null;
  const legacyThemeConfig =
    lives.find((live) => live.themeConfig)?.themeConfig ?? null;
  const products = previewLive
    ? await getProductsByLiveIdForUser(previewLive.id, session.user.id)
    : [];
  const themeConfig = parseLiveThemeConfig(userThemeConfig ?? legacyThemeConfig);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar para suas lives
      </Link>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <LiveAppearanceSection
            title={previewLive?.title}
            coverImageUrl={previewLive?.coverImageUrl ?? null}
            initialTheme={themeConfig}
            products={products}
          />
        </CardContent>
      </Card>
    </main>
  );
}
