import { Skeleton } from "@/components/ui/skeleton";

export function EventPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <Skeleton className="mb-4 h-7 w-36 rounded-full" />
            <Skeleton className="mb-3 h-12 w-full max-w-lg md:h-16" />
            <Skeleton className="mb-6 h-12 w-3/4 md:h-16" />
            <div className="flex flex-wrap gap-6">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
        </div>
      </section>

      {/* Registration form skeleton */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <Skeleton className="mb-8 h-9 w-48" />

          {/* Ticket tiers */}
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="mb-10 grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border-2 border-border p-5">
                <Skeleton className="mb-2 h-6 w-32" />
                <Skeleton className="mb-3 h-4 w-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>

          {/* Form fields */}
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full sm:col-span-2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="mb-4 h-6 w-44" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full sm:col-span-2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="mt-8 h-12 w-full rounded-md" />
        </div>
      </section>
    </div>
  );
}
