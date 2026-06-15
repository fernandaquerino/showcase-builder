"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  ImportItemPatch,
  ImportProductItem,
} from "@/lib/products/import-item";

export type ProductImportEditSheetProps = {
  item: ImportProductItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: ImportItemPatch) => void;
};

type Draft = {
  name: string;
  category: string;
  size: string;
  color: string;
  price: string;
  imageUrl: string;
};

function draftFromItem(item: ImportProductItem): Draft {
  return {
    name: item.name,
    category: item.category,
    size: item.size ?? "",
    color: item.color ?? "",
    price: item.price ?? "",
    imageUrl: item.imageUrl,
  };
}

export function ProductImportEditSheet({
  item,
  open,
  onOpenChange,
  onSave,
}: ProductImportEditSheetProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    item ? draftFromItem(item) : {
      name: "",
      category: "",
      size: "",
      color: "",
      price: "",
      imageUrl: "",
    },
  );
  // Reset the draft when a different item opens the sheet (React's recommended
  // "adjust state during render" pattern — no effect needed).
  const [trackedId, setTrackedId] = useState<string | null>(item?.id ?? null);
  if (item && item.id !== trackedId) {
    setTrackedId(item.id);
    setDraft(draftFromItem(item));
  }

  const nameId = useId();
  const categoryId = useId();
  const sizeId = useId();
  const colorId = useId();
  const priceId = useId();
  const imageId = useId();

  function update<K extends keyof Draft>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!item) {
      return;
    }
    onSave(item.id, {
      name: draft.name,
      category: draft.category,
      size: draft.size.trim() === "" ? null : draft.size,
      color: draft.color.trim() === "" ? null : draft.color,
      price: draft.price.trim() === "" ? null : draft.price,
      imageUrl: draft.imageUrl,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar produto</SheetTitle>
          <SheetDescription>
            Ajuste apenas o que precisar. O link de afiliado é preservado.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nome</Label>
            <Input
              id={nameId}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={categoryId}>Categoria</Label>
            <Input
              id={categoryId}
              value={draft.category}
              onChange={(event) => update("category", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={sizeId}>Tamanho usado na live</Label>
              <Input
                id={sizeId}
                value={draft.size}
                onChange={(event) => update("size", event.target.value)}
                placeholder="Ex.: M"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={colorId}>Cor</Label>
              <Input
                id={colorId}
                value={draft.color}
                onChange={(event) => update("color", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={priceId}>Preço</Label>
            <Input
              id={priceId}
              value={draft.price}
              onChange={(event) => update("price", event.target.value)}
              placeholder="99,90"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={imageId}>Endereço da imagem</Label>
            <Input
              id={imageId}
              type="url"
              inputMode="url"
              value={draft.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Se a imagem não tiver vindo, cole o endereço de uma imagem pública.
            </p>
          </div>

          {item && (
            <div className="space-y-1.5">
              <Label>Link de afiliado</Label>
              <p className="truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {item.affiliateUrl}
              </p>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} className="min-h-11">
            Salvar alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
