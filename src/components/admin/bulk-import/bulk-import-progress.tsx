"use client";

export type BulkImportProgressProps = {
  done: number;
  total: number;
};

export function BulkImportProgress({ done, total }: BulkImportProgressProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const isComplete = done >= total;

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {isComplete
            ? "Busca concluída."
            : "Buscando informações dos produtos..."}
        </p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {done} de {total} produtos encontrados
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Progresso da busca de produtos"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
