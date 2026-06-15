import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function PublicShowcaseNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary">Vitrine</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Esta vitrine não foi encontrada.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Confira o link recebido ou volte para a página inicial.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Voltar para a home</Link>
        </Button>
      </div>
    </main>
  );
}
