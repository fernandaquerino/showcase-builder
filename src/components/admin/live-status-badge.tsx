import { CircleCheck, PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function LiveStatusBadge({ status }: { status: "draft" | "published" }) {
  if (status === "published") {
    return (
      <Badge variant="success">
        <CircleCheck className="size-3.5" aria-hidden="true" />
        Publicada
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <PencilLine className="size-3.5" aria-hidden="true" />
      Rascunho
    </Badge>
  );
}
