"use client";

import { ImageOff, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrlPrice } from "@/lib/price";
import type { ImportProductItem } from "@/lib/products/import-item";
import { ImportStatusBadge } from "./import-status-badge";

export type ProductImportPreviewCardProps = {
  item: ImportProductItem;
  onSizeChange: (size: string) => void;
  onToggleSelected: (selected: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
  onRetry: () => void;
};

export function ProductImportPreviewCard({
  item,
  onSizeChange,
  onToggleSelected,
  onEdit,
  onRemove,
  onRetry,
}: ProductImportPreviewCardProps) {
  const sizeId = useId();
  const selectId = useId();
  const price = formatBrlPrice(item.price);
  const isBusy = item.status === "extracting" || item.status === "saving";
  const isFailed = item.status === "failed";
  const canSelect = item.status === "ready";

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="flex items-center pt-0.5">
          <Checkbox
            id={selectId}
            checked={item.selected}
            disabled={!canSelect && !item.selected}
            onCheckedChange={(checked) => onToggleSelected(checked === true)}
          />
          <Label htmlFor={selectId} className="sr-only">
            Selecionar {item.name || "produto"}
          </Label>
        </div>
        <ImportStatusBadge status={item.status} />
      </div>

      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- extracted external product image.
          <img
            src={item.imageUrl}
            alt={item.name || "Prévia do produto"}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {item.category && (
          <p className="text-xs font-medium text-muted-foreground">{item.category}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-5">
          {item.name || "Produto sem nome"}
        </h3>
        {(price || item.color) && (
          <p className="text-sm text-muted-foreground">
            {[price, item.color].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {isFailed ? (
        <div role="alert" className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {item.errorMessage ?? "Não conseguimos buscar este produto."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRetry} className="min-h-11">
              <RefreshCw className="size-4" aria-hidden="true" />
              Tentar novamente
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="min-h-11">
              Preencher manualmente
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor={sizeId}>Tamanho usado na live</Label>
          <Input
            id={sizeId}
            value={item.size ?? ""}
            onChange={(event) => onSizeChange(event.target.value)}
            placeholder="Ex.: M"
            disabled={isBusy}
            className="min-h-11"
          />
          {item.availableSizes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Tamanhos disponíveis: {item.availableSizes.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={isBusy}
          className="min-h-11"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Editar produto
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={isBusy}
          aria-label={`Remover ${item.name || "produto"} da importação`}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
