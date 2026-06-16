import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LiveForm } from "@/components/admin/live-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nova live",
};

export default async function NewLivePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar para suas lives
      </Link>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-2xl">Nova live</CardTitle>
          <CardDescription>
            Salve como rascunho agora e publique quando estiver pronta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiveForm mode="create" />
        </CardContent>
      </Card>
    </main>
  );
}
