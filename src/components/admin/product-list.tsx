"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  SortableProductCard,
  type ProductCardData,
} from "@/components/admin/sortable-product-card";
import {
  moveProductDownAction,
  moveProductUpAction,
  reorderProductsAction,
} from "@/server/actions/products";

type OrderStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

function signature(items: ProductCardData[]): string {
  return items.map((item) => item.id).join(",");
}

export function ProductList({
  liveId,
  products,
}: {
  liveId: string;
  products: ProductCardData[];
}) {
  const [items, setItems] = useState(products);
  const [status, setStatus] = useState<OrderStatus>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  // Re-sync with the server order whenever the props change (e.g. after a
  // product is added or deleted and the page re-renders).
  const propsSignature = signature(products);
  const lastSignature = useRef(propsSignature);
  useEffect(() => {
    if (lastSignature.current !== propsSignature) {
      lastSignature.current = propsSignature;
      setItems(products);
      setStatus({ kind: "idle" });
    }
  }, [propsSignature, products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function persist(nextItems: ProductCardData[], previous: ProductCardData[]) {
    setItems(nextItems);
    setStatus({ kind: "saving" });

    startTransition(async () => {
      const result = await reorderProductsAction(
        liveId,
        nextItems.map((item) => item.id),
      );

      if (!result.success) {
        setItems(previous);
        setStatus({ kind: "error", message: result.message });
        return;
      }

      lastSignature.current = signature(nextItems);
      setStatus({ kind: "saved" });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    persist(arrayMove(items, oldIndex, newIndex), items);
  }

  function move(productId: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === productId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= items.length) {
      return;
    }

    const previous = items;
    const nextItems = arrayMove(items, index, target);
    setItems(nextItems);
    setStatus({ kind: "saving" });

    startTransition(async () => {
      const result =
        direction === -1
          ? await moveProductUpAction(liveId, productId)
          : await moveProductDownAction(liveId, productId);

      if (!result.success) {
        setItems(previous);
        setStatus({ kind: "error", message: result.message });
        return;
      }

      lastSignature.current = signature(nextItems);
      setStatus({ kind: "saved" });
    });
  }

  return (
    <div className="space-y-3">
      <p
        className="min-h-5 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {status.kind === "saving" && "Salvando nova ordem..."}
        {status.kind === "saved" && "Ordem atualizada"}
        {status.kind === "error" && (
          <span className="text-destructive">{status.message}</span>
        )}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-3">
            {items.map((product, index) => (
              <SortableProductCard
                key={product.id}
                liveId={liveId}
                product={product}
                position={index + 1}
                total={items.length}
                disabled={isPending}
                onMoveUp={() => move(product.id, -1)}
                onMoveDown={() => move(product.id, 1)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
