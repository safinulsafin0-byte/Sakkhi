import { Skeleton } from "@/components/ui/Skeleton";

export default function CampaignLoading() {
  return (
    <div className="space-y-10 py-6 sm:py-8">
      {/* Breadcrumb Skeleton */}
      <Skeleton className="h-5 w-60 rounded" />

      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 sm:h-14 w-2/3 rounded-lg" />
        <Skeleton className="h-5 w-48 rounded" />
      </div>

      {/* Two-column layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          <div className="p-6 border border-border-soft rounded-xl bg-paper-card space-y-4">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-full rounded-full" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          <div className="space-y-6">
            <Skeleton className="h-8 w-60 rounded" />
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 border border-border-soft rounded-xl bg-paper-card space-y-4">
            <Skeleton className="h-6 w-32 rounded" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

