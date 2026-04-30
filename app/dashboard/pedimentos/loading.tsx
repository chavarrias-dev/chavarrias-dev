import {
  SkeletonCard,
  SkeletonLine,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function PedimentosLoading() {
  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SkeletonLine className="mb-2 h-8 w-44 max-w-[90vw]" />
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonLine className="h-10 w-44 shrink-0 rounded-lg" />
      </div>

      <SkeletonCard className="mb-6 space-y-4">
        <SkeletonLine className="h-4 w-24" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLine key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <SkeletonLine className="h-10 w-28 rounded-lg" />
          <SkeletonLine className="h-10 w-24 rounded-lg" />
        </div>
      </SkeletonCard>

      <SkeletonTable rows={5} columns={7} minWidthClass="min-w-[920px]" />
    </main>
  );
}
