"use client";

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
import { Button } from "@/components/ui/button";
import { deleteLiveAction } from "@/server/actions/lives";

type DeleteLiveDialogProps = {
  liveId: string;
  title: string;
  status: "draft" | "published";
  /** Redirect to the admin list after deleting (used from the edit page). */
  redirectToAdmin?: boolean;
  trigger: React.ReactNode;
};

export function DeleteLiveDialog({
  liveId,
  title,
  status,
  redirectToAdmin = false,
  trigger,
}: DeleteLiveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLiveAction(liveId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Live excluída.");
      setOpen(false);

      if (redirectToAdmin) {
        router.push("/admin");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não poderá ser desfeita. Os produtos vinculados a esta
            live também serão excluídos quando essa funcionalidade existir.
            {status === "published" &&
              " Como a live está publicada, a publicação também será removida."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isPending}
            loadingText="Excluindo..."
          >
            Excluir live
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
