"use client";

import { Button } from "@/components/ui/button";
import type { ImportCounts } from "@/lib/products/import-item";

export type BulkImportSummaryProps = {
  counts: ImportCounts;
  saving: boolean;
  onReviewPending: () => void;
  onAddReady: () => void;
  onCancel: () => void;
};

export function BulkImportSummary({
  counts,
  saving,
  onReviewPending,
  onAddReady,
  onCancel,
}: BulkImportSummaryProps) {
  const hasPending = counts.needsReview > 0 || counts.failed > 0;
  const readyLabel = saving
    ? "Salvando produtos..."
    : `${counts.ready} ${counts.ready === 1 ? "pronto" : "prontos"}`;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">
          {saving
            ? "Adicionando produtos à live"
            : `${counts.total} ${counts.total === 1 ? "produto na importação" : "produtos na importação"}`}
        </h2>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li aria-live="polite">{readyLabel}</li>
          {counts.needsReview > 0 && <li>{counts.needsReview} precisam de revisão</li>}
          {counts.failed > 0 && <li>{counts.failed} não foram encontrados</li>}
          {counts.duplicates > 0 && <li>{counts.duplicates} já na live</li>}
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          onClick={onAddReady}
          loading={saving}
          loadingText="Adicionando..."
          disabled={saving || counts.selected === 0}
          className="min-h-11"
        >
          Adicionar à vitrine
        </Button>
        {hasPending && (
          <Button
            type="button"
            variant="outline"
            onClick={onReviewPending}
            disabled={saving}
            className="min-h-11"
          >
            Revisar pendências
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="min-h-11 sm:ml-auto"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
