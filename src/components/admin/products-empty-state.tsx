import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function ProductsEmptyState({ liveId }: { liveId: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium">Nenhum produto adicionado ainda</p>
        <p className="text-sm text-muted-foreground">
          Cole os links acima para começar ou cadastre uma peça manualmente.
        </p>
      </div>
      <Button asChild variant="outline" className="min-h-11 sm:shrink-0">
        <Link href={`/admin/lives/${liveId}/products/new`}>
          <Plus />
           adicionar produto
        </Link>
      </Button>
    </div>
  );
}
