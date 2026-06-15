import { PackagePlus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ProductsEmptyState({ liveId }: { liveId: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <PackagePlus className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">Nenhum produto adicionado ainda</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Comece adicionando a primeira peça que será mostrada na sua live.
        </p>
      </div>
      <Button asChild>
        <Link href={`/admin/lives/${liveId}/products/new`}>
          Adicionar primeiro produto
        </Link>
      </Button>
    </div>
  );
}
