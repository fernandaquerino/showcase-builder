"use client";

import { Globe, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { publishLiveAction, unpublishLiveAction } from "@/server/actions/lives";

type PublishControlProps = {
  liveId: string;
  status: "draft" | "published";
  size?: ButtonProps["size"];
  fullWidth?: boolean;
};

export function PublishControl({
  liveId,
  status,
  size = "sm",
  fullWidth = false,
}: PublishControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      const result = await publishLiveAction(liveId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Live publicada. As outras lives foram despublicadas.");
      router.refresh();
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishLiveAction(liveId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Live despublicada.");
      setOpen(false);
      router.refresh();
    });
  }

  if (status === "draft") {
    return (
      <Button
        variant="success"
        size={size}
        fullWidth={fullWidth}
        onClick={handlePublish}
        loading={isPending}
        loadingText="Publicando..."
      >
        <Globe className="size-4" aria-hidden="true" />
        Publicar
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={size} fullWidth={fullWidth}>
          <Undo2 className="size-4" aria-hidden="true" />
          Despublicar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Despublicar esta live?</AlertDialogTitle>
          <AlertDialogDescription>
            A página pública desta live deixará de ser exibida para seus
            seguidores até que você publique novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            variant="default"
            onClick={handleUnpublish}
            loading={isPending}
            loadingText="Despublicando..."
          >
            Despublicar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
