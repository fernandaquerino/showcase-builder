import { CalendarPlus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LiveEmptyState() {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <CalendarPlus className="size-7" aria-hidden="true" />
        </span>
        <CardTitle>Nenhuma live por aqui ainda</CardTitle>
        <CardDescription className="max-w-md">
          Crie sua primeira live para montar a vitrine de produtos e
          compartilhar com seus seguidores.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/admin/lives/new">Criar primeira live</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
