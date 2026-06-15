import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-lg font-semibold">
          Live Showcase Builder
        </Link>
        <blockquote className="max-w-lg">
          <p className="text-3xl font-medium leading-tight text-balance">
            Seus produtos organizados em um lugar simples de compartilhar.
          </p>
          <footer className="mt-5 text-sm text-primary-foreground/75">
            Menos links perdidos. Mais clareza para quem acompanha sua live.
          </footer>
        </blockquote>
      </aside>
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-block text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
          >
            Live Showcase Builder
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
