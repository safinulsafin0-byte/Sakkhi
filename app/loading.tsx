import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-16 py-6 sm:py-12 max-w-4xl mx-auto">
      {/* Hero Skeleton */}
      <div className="space-y-6 text-center">
        <Skeleton className="h-6 w-48 mx-auto rounded-full" />
        <Skeleton className="h-12 sm:h-16 w-3/4 mx-auto rounded-lg" />
        <Skeleton className="h-20 max-w-2xl mx-auto rounded-lg" />
        <div className="flex justify-center gap-4 pt-4">
          <Skeleton className="h-12 w-40 rounded-lg" />
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      </div>

      {/* Campaigns Skeleton Grid */}
      <div className="space-y-6 pt-8">
        <Skeleton className="h-8 w-64 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 border border-border-soft rounded-xl bg-paper-card space-y-4">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="p-8 border border-border-soft rounded-xl bg-paper-card space-y-4">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

