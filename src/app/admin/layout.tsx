import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserMenu } from "@/components/admin/user-menu";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/35">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Live Showcase</span>
          </Link>
          <UserMenu
            name={session.user.name ?? "Criadora"}
            email={session.user.email ?? ""}
            image={session.user.image}
          />
        </div>
      </header>
      {children}
    </div>
  );
}
