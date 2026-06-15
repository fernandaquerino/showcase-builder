function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function PublicShowcaseLoading() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border bg-card p-5 sm:p-8">
          <div className="flex gap-5">
            <Skeleton className="size-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-5">
          <Skeleton className="h-8 w-44" />
          <div className="flex gap-2 overflow-hidden">
            <Skeleton className="h-11 w-24 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/6] w-full" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
