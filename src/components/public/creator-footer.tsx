import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PublicCreator } from "@/server/db/queries/public-showcase";

type CreatorFooterProps = {
  creator: PublicCreator;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function CreatorFooter({ creator }: CreatorFooterProps) {
  return (
    <footer className="border-t border-[var(--live-border)] py-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 border bg-secondary">
            {creator.avatarUrl && (
              <AvatarImage
                src={creator.avatarUrl}
                alt={`Foto de ${creator.name}`}
              />
            )}
            <AvatarFallback>{initials(creator.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">
              Curadoria de @{creator.handle}
            </p>
            <p className="text-sm text-[var(--live-muted-foreground)]">
              Vitrine criada por {creator.name}.
            </p>
          </div>
        </div>

        <Button asChild variant="link" className="text-[var(--live-primary)]">
          <Link href="/">Criar minha vitrine</Link>
        </Button>
      </div>
    </footer>
  );
}
