import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const benefits = [
  "Todos os produtos da live em um só link",
  "Experiência rápida e clara no celular",
  "Uma área simples para organizar sua vitrine",
];

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_right,oklch(0.9_0.08_30),transparent_55%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShoppingBag className="size-5" aria-hidden="true" />
          </span>
          Live Showcase
        </Link>
        <Button asChild variant="ghost">
          <Link href={session ? "/admin" : "/login"}>
            {session ? "Ir para o painel" : "Entrar"}
          </Link>
        </Button>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
        <div>
          <span className="inline-flex rounded-full border bg-card px-3 py-1 text-sm font-medium text-primary shadow-sm">
            Sua live continua vendendo depois que termina
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Uma vitrine bonita para cada produto da sua live.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Organize links, fotos e detalhes em uma página feita para suas
            seguidoras encontrarem o que viram, sem se perder nos stories.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={session ? "/admin" : "/signup"}>
                {session ? "Abrir meu painel" : "Criar minha conta"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            {!session && (
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Já tenho uma conta</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Feito para criadoras
          </p>
          <ul className="mt-6 space-y-5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <span className="leading-6">{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-2xl bg-muted p-5">
            <p className="font-medium">Seu link fica pronto para compartilhar.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Crie uma live, adicione os produtos e publique uma página bonita
              para suas seguidoras.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
