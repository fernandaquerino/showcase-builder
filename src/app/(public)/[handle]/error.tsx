"use client";

import { Button } from "@/components/ui/button";

export default function PublicShowcaseError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Não foi possível carregar esta vitrine agora.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tente novamente em alguns instantes.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
