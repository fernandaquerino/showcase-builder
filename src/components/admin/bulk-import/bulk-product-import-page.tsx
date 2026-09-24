"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  countItems,
  itemFromParsedLink,
  itemToFormValues,
  type ImportItemPatch,
  type ImportProductItem,
} from "@/lib/products/import-item";
import type { ParsedLink } from "@/lib/products/parse-links";
import type { ExtractionResponse } from "@/lib/validations/extract";
import { extractionErrorMessage } from "@/lib/extract-messages";
import { createProductsBatchAction } from "@/server/actions/products";
import {
  bulkImportReducer,
  clearPersistedImport,
  loadPersistedImport,
  persistImport,
} from "./reducer";
import { BulkImportCancelDialog } from "./bulk-import-cancel-dialog";
import { BulkImportProgress } from "./bulk-import-progress";
import { BulkImportSelectionBar } from "./bulk-import-selection-bar";
import { BulkImportSummary } from "./bulk-import-summary";
import { BulkProductLinksInput } from "./bulk-product-links-input";
import { ProductImportEditSheet } from "./product-import-edit-sheet";
import { ProductImportPreviewCard } from "./product-import-preview-card";

const EXTRACTION_CONCURRENCY = 3;

export type BulkProductImportPageProps = {
  liveId: string;
  allowedHosts: string[];
  existingUrlKeys: string[];
};

async function requestExtraction(url: string): Promise<ExtractionResponse> {
  const response = await fetch("/api/products/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return (await response.json()) as ExtractionResponse;
}

/** Runs `worker` over the list with at most `limit` concurrent calls. */
async function withConcurrency<T>(
  list: T[],
  limit: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function pump(): Promise<void> {
    const index = cursor++;
    if (index >= list.length) {
      return;
    }
    await worker(list[index]);
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, () => pump()),
  );
}

export function BulkProductImportPage({
  liveId,
  allowedHosts,
  existingUrlKeys,
}: BulkProductImportPageProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(bulkImportReducer, { items: [] });
  const [phase, setPhase] = useState<"input" | "review">("input");
  const [linksText, setLinksText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resumeItems, setResumeItems] = useState<ImportProductItem[] | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Offer to resume an import left in progress (sessionStorage, per live).
  // sessionStorage is a client-only external store: reading it must happen
  // after mount so the server and first client render agree (no hydration
  // mismatch), which is exactly what an effect is for here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from sessionStorage (external store) on mount; must run post-hydration.
    setResumeItems(loadPersistedImport(liveId));
  }, [liveId]);

  // Persist review state so a reload can recover it.
  useEffect(() => {
    if (phase === "review") {
      persistImport(liveId, state.items);
    }
  }, [liveId, phase, state.items]);

  const extractOne = useCallback(async (id: string, affiliateUrl: string) => {
    dispatch({ type: "extracting", id });
    try {
      const result = await requestExtraction(affiliateUrl);
      if (result.success) {
        dispatch({ type: "applyExtraction", id, data: result.data });
      } else {
        dispatch({ type: "failed", id, message: result.error.message });
      }
    } catch {
      dispatch({
        type: "failed",
        id,
        message: extractionErrorMessage("EXTRACTION_FAILED"),
      });
    }
  }, []);

  const runQueue = useCallback(
    async (targets: { id: string; affiliateUrl: string }[]) => {
      setIsExtracting(true);
      await withConcurrency(targets, EXTRACTION_CONCURRENCY, (target) =>
        extractOne(target.id, target.affiliateUrl),
      );
      setIsExtracting(false);
    },
    [extractOne],
  );

  function handleStartImport(links: ParsedLink[]) {
    const items = links.map((link) =>
      itemFromParsedLink(link, `link-${link.originalIndex}`),
    );
    dispatch({ type: "init", items });
    setPhase("review");
    const targets = items
      .filter((item) => item.status === "pending")
      .map((item) => ({ id: item.id, affiliateUrl: item.affiliateUrl }));
    void runQueue(targets);
  }

  function handleRetry(item: ImportProductItem) {
    void runQueue([{ id: item.id, affiliateUrl: item.affiliateUrl }]);
  }

  function focusFirstPending() {
    const pending = state.items.find((item) => item.status === "needs-review");
    if (pending) {
      cardRefs.current.get(pending.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      cardRefs.current.get(pending.id)?.focus();
    }
  }

  async function handleAddReady() {
    const toSave = state.items.filter((item) => item.selected);
    if (toSave.length === 0) {
      return;
    }

    setIsSaving(true);
    dispatch({ type: "markSaving", ids: toSave.map((item) => item.id) });

    const result = await createProductsBatchAction(
      liveId,
      toSave.map(itemToFormValues),
    );
    setIsSaving(false);

    if (result.success) {
      toast.success(
        `${result.count} ${result.count === 1 ? "produto foi adicionado" : "produtos foram adicionados"} à live.`,
      );
      clearPersistedImport(liveId);
      dispatch({ type: "reset" });
      setPhase("input");
      setResumeItems(null);
      router.refresh();
      return;
    }

    dispatch({
      type: "markFailedSave",
      ids: toSave.map((item) => item.id),
      message: result.message,
    });
    toast.error(result.message);
  }

  function handleEdit(id: string, patch: ImportItemPatch) {
    dispatch({ type: "edit", id, patch });
  }

  function handleDiscard() {
    dispatch({ type: "reset" });
    setPhase("input");
    setLinksText("");
    setCancelOpen(false);
    setResumeItems(null);
  }

  const counts = countItems(state.items);
  const processed = state.items.filter(
    (item) => item.status === "ready" || item.status === "failed",
  ).length;
  const editingItem = state.items.find((item) => item.id === editingId) ?? null;

  if (resumeItems && phase === "input") {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            Encontramos uma importação em andamento
          </h2>
          <p className="text-sm text-muted-foreground">
            Você tem {resumeItems.length} produtos em revisão para esta live.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              dispatch({ type: "init", items: resumeItems });
              setPhase("review");
              setResumeItems(null);
            }}
          >
            Continuar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={handleDiscard}
          >
            Descartar
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "input") {
    return (
      <BulkProductLinksInput
        value={linksText}
        onChange={setLinksText}
        onSubmit={handleStartImport}
        allowedHosts={allowedHosts}
        existingUrlKeys={existingUrlKeys}
      />
    );
  }

  return (
    <div className="space-y-5">
      <BulkImportSummary
        counts={counts}
        saving={isSaving}
        onReviewPending={focusFirstPending}
        onAddReady={() => void handleAddReady()}
        onCancel={() => setCancelOpen(true)}
      />

      {isExtracting && (
        <BulkImportProgress done={processed} total={state.items.length} />
      )}

      {!isExtracting && (
        <BulkImportSelectionBar
          selected={counts.selected}
          ready={counts.ready}
          disabled={isSaving}
          onSelectAllReady={() => dispatch({ type: "selectAllReady" })}
          onClearSelection={() => dispatch({ type: "clearSelection" })}
        />
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.items.map((item) => (
          <li key={item.id}>
            <div
              ref={(node) => {
                if (node) {
                  cardRefs.current.set(item.id, node);
                } else {
                  cardRefs.current.delete(item.id);
                }
              }}
            >
              <ProductImportPreviewCard
                item={item}
                onSizeChange={(size) =>
                  dispatch({ type: "setSize", id: item.id, size })
                }
                onToggleSelected={(selected) =>
                  dispatch({ type: "toggleSelected", id: item.id, selected })
                }
                onEdit={() => setEditingId(item.id)}
                onRemove={() => dispatch({ type: "remove", id: item.id })}
                onRetry={() => handleRetry(item)}
              />
            </div>
          </li>
        ))}
      </ul>

      <ProductImportEditSheet
        item={editingItem}
        open={editingId !== null}
        onOpenChange={(open) => setEditingId(open ? editingId : null)}
        onSave={handleEdit}
      />

      <BulkImportCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleDiscard}
      />
    </div>
  );
}
