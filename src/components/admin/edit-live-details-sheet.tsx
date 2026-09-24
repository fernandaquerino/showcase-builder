"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { LiveForm } from "@/components/admin/live-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LiveFormValues } from "@/lib/validations/live";

export function EditLiveDetailsSheet({
  liveId,
  initialValues,
}: {
  liveId: string;
  initialValues: LiveFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [formValues] = useState(initialValues);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11">
          <Pencil className="size-4" aria-hidden="true" />
          Editar dados da live
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby="edit-live-details-description">
        <SheetHeader>
          <SheetTitle>Editar dados da live</SheetTitle>
          <SheetDescription id="edit-live-details-description">
            Atualize as informações principais da vitrine.
          </SheetDescription>
        </SheetHeader>
        <LiveForm
          mode="edit"
          liveId={liveId}
          initialValues={formValues}
          onSaved={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
