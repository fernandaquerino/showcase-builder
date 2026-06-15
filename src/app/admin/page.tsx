import type { Metadata } from "next";
import { CalendarPlus, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const firstName = session.user.name?.split(/\s+/)[0] ?? "criadora";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          Seu espaço de criação
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Olá, {firstName}.
        </h1>
        <p className="mt-2 text-muted-foreground">@{session.user.handle}</p>
      </div>

      <Card className="mt-10 border-dashed">
        <CardHeader className="items-center text-center">
          <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <CalendarPlus className="size-7" aria-hidden="true" />
          </span>
          <CardTitle>Nenhuma live por aqui ainda</CardTitle>
          <CardDescription className="max-w-md">
            Na Fase 1, você poderá criar, editar e publicar suas lives a partir
            deste painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button disabled aria-describedby="phase-one-note">
            Criar primeira live
          </Button>
        </CardContent>
      </Card>
      <p
        id="phase-one-note"
        className="mt-4 text-center text-sm text-muted-foreground"
      >
        Gestão de lives disponível na próxima fase.
      </p>
    </main>
  );
}
