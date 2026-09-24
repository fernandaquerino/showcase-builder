"use client";

import { Button } from "@/components/ui/button";

export type BulkImportSelectionBarProps = {
  selected: number;
  ready: number;
  disabled?: boolean;
  onSelectAllReady: () => void;
  onClearSelection: () => void;
};

export function BulkImportSelectionBar({
  selected,
  ready,
  disabled = false,
  onSelectAllReady,
  onClearSelection,
}: BulkImportSelectionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium" aria-live="polite">
        {selected} {selected === 1 ? "produto selecionado" : "produtos selecionados"}
      </p>
      <div className="ml-auto flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSelectAllReady}
          disabled={disabled || ready === 0 || selected > 0}
          className="min-h-11"
        >
          Selecionar todos os prontos
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={disabled || selected === 0}
          className="min-h-11"
        >
          Limpar seleção
        </Button>
      </div>
    </div>
  );
}
