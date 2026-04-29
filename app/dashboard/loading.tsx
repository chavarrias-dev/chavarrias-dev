import {
  SkeletonCard,
  SkeletonLine,
} from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div
        className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-5"
        aria-hidden
      >
        <SkeletonLine className="h-10 w-24 rounded-lg sm:w-28" />
        <SkeletonLine className="h-10 w-24 rounded-lg sm:w-28" />
        <SkeletonLine className="h-10 w-24 rounded-lg sm:w-28" />
        <SkeletonLine className="h-10 w-24 rounded-lg sm:w-28" />
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SkeletonLine className="h-9 w-56 max-w-full sm:h-10 sm:w-72" />
            <SkeletonLine className="h-8 w-24 rounded-full" />
          </div>
          <SkeletonLine className="h-4 w-full max-w-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonLine className="h-10 w-36 rounded-lg" />
          <SkeletonLine className="h-10 w-32 rounded-lg" />
          <SkeletonLine className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <SkeletonCard className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <SkeletonLine className="h-6 w-48" />
          <SkeletonLine className="h-4 w-24" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 px-1 py-3 sm:grid-cols-12 sm:items-center"
            >
              <SkeletonLine className="h-4 sm:col-span-4" />
              <SkeletonLine className="h-4 sm:col-span-4" />
              <SkeletonLine className="h-4 sm:col-span-4" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <SkeletonLine className="h-6 w-44" />
          <SkeletonLine className="h-4 w-28" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 px-1 py-3 sm:grid-cols-12 sm:items-center"
            >
              <SkeletonLine className="h-4 sm:col-span-3" />
              <SkeletonLine className="h-4 sm:col-span-4" />
              <SkeletonLine className="h-4 sm:col-span-3" />
              <SkeletonLine className="h-4 sm:col-span-2" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </main>
  );
}
