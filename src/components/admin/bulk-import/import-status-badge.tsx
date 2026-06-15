import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImportProductStatus } from "@/lib/products/import-item";

type BadgeVariant = "default" | "secondary" | "success" | "outline";

const STATUS_CONFIG: Record<
  ImportProductStatus,
  { label: string; variant: BadgeVariant; className?: string }
> = {
  pending: { label: "Aguardando", variant: "outline" },
  extracting: { label: "Buscando informações...", variant: "secondary" },
  ready: { label: "Pronto para adicionar", variant: "success" },
  "needs-review": { label: "Precisa de revisão", variant: "default" },
  failed: {
    label: "Não foi possível buscar",
    variant: "outline",
    className: "border-destructive/40 text-destructive",
  },
  duplicate: { label: "Já está na live", variant: "outline" },
  "already-added": { label: "Já está na live", variant: "outline" },
  saving: { label: "Salvando...", variant: "secondary" },
  saved: { label: "Adicionado", variant: "success" },
};

export function ImportStatusBadge({ status }: { status: ImportProductStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={cn("w-fit", config.className)}>
      {config.label}
    </Badge>
  );
}
