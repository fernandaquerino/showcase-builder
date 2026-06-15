function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function PublicShowcaseLoading() {
  return (
    <main className="min-h-screen bg-stone-50">
      <section className="overflow-hidden rounded-b-[2rem] bg-stone-950 px-5 py-8 sm:mx-auto sm:mt-6 sm:max-w-6xl sm:rounded-[2rem] sm:px-8 lg:px-10">
        <div className="flex min-h-[520px] flex-col justify-end">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full bg-white/15" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 bg-white/15" />
                <Skeleton className="h-3 w-24 bg-white/15" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-36 bg-white/15" />
              <Skeleton className="h-14 w-full max-w-2xl bg-white/15" />
              <Skeleton className="h-14 w-4/5 max-w-xl bg-white/15" />
              <Skeleton className="h-5 w-3/4 bg-white/15" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32 rounded-full bg-white/15" />
              <Skeleton className="h-10 w-24 rounded-full bg-white/15" />
            </div>
            <Skeleton className="h-12 w-52 rounded-full bg-white/15" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-5 py-8 sm:px-8 lg:px-10">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full bg-white" />
          ))}
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 bg-white" />
            <Skeleton className="h-10 w-72 max-w-full bg-white" />
          </div>
          <div className="flex gap-2 overflow-hidden rounded-2xl bg-white/70 p-3">
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
