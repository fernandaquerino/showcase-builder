import type { ExtractionSuccessData } from "@/lib/validations/extract";
import {
  applyExtractionToItem,
  statusForItem,
  type ImportItemPatch,
  type ImportProductItem,
} from "@/lib/products/import-item";

export type BulkImportState = {
  items: ImportProductItem[];
};

export type BulkImportAction =
  | { type: "init"; items: ImportProductItem[] }
  | { type: "extracting"; id: string }
  | { type: "applyExtraction"; id: string; data: ExtractionSuccessData }
  | { type: "failed"; id: string; message: string }
  | { type: "edit"; id: string; patch: ImportItemPatch }
  | { type: "setSize"; id: string; size: string }
  | { type: "remove"; id: string }
  | { type: "toggleSelected"; id: string; selected: boolean }
  | { type: "selectAllReady" }
  | { type: "clearSelection" }
  | { type: "markSaving"; ids: string[] }
  | { type: "markFailedSave"; ids: string[]; message: string }
  | { type: "reset" };

function mapItem(
  state: BulkImportState,
  id: string,
  fn: (item: ImportProductItem) => ImportProductItem,
): BulkImportState {
  return {
    items: state.items.map((item) => (item.id === id ? fn(item) : item)),
  };
}

export function bulkImportReducer(
  state: BulkImportState,
  action: BulkImportAction,
): BulkImportState {
  switch (action.type) {
    case "init":
      return { items: action.items };

    case "extracting":
      return mapItem(state, action.id, (item) => ({
        ...item,
        status: "extracting",
        errorMessage: null,
      }));

    case "applyExtraction":
      return mapItem(state, action.id, (item) =>
        applyExtractionToItem(item, action.data),
      );

    case "failed":
      return mapItem(state, action.id, (item) => ({
        ...item,
        status: "failed",
        selected: false,
        errorMessage: action.message,
      }));

    case "edit":
      return mapItem(state, action.id, (item) => {
        const next = { ...item, ...action.patch, manuallyEdited: true };
        return { ...next, status: statusForItem(next) };
      });

    case "setSize":
      return mapItem(state, action.id, (item) => ({
        ...item,
        size: action.size.trim() === "" ? null : action.size,
        manuallyEdited: true,
      }));

    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id) };

    case "toggleSelected":
      return mapItem(state, action.id, (item) =>
        item.status === "ready" ? { ...item, selected: action.selected } : item,
      );

    case "selectAllReady":
      return {
        items: state.items.map((item) =>
          item.status !== "failed" ? { ...item, selected: true } : item,
        ),
      };

    case "clearSelection":
      return {
        items: state.items.map((item) =>
          item.status === "ready" ? { ...item, selected: false } : item,
        ),
      };

    case "markSaving":
      return {
        items: state.items.map((item) =>
          action.ids.includes(item.id) ? { ...item, status: "saving" } : item,
        ),
      };

    case "markFailedSave":
      return {
        items: state.items.map((item) =>
          action.ids.includes(item.id)
            ? {
                ...item,
                status: statusForItem(item),
                errorMessage: action.message,
              }
            : item,
        ),
      };

    case "reset":
      return { items: [] };

    default:
      return state;
  }
}

const STORAGE_PREFIX = "bulk-import:";

function storageKey(liveId: string): string {
  return `${STORAGE_PREFIX}${liveId}`;
}

/**
 * Persists only the review state (never HTML or tokens — those are not part of
 * the item shape) so a reload can offer to continue an in-progress import.
 */
export function persistImport(liveId: string, items: ImportProductItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (items.length === 0) {
      window.sessionStorage.removeItem(storageKey(liveId));
    } else {
      window.sessionStorage.setItem(storageKey(liveId), JSON.stringify(items));
    }
  } catch {
    // Storage may be unavailable (private mode); the import still works in-memory.
  }
}

export function loadPersistedImport(liveId: string): ImportProductItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(liveId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ImportProductItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPersistedImport(liveId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(storageKey(liveId));
  } catch {
    // Ignore.
  }
}
