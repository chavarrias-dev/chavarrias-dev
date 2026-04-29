import { SkeletonLine, SkeletonTable } from "@/components/ui/skeleton";

export default function PedimentosLoading() {
  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SkeletonLine className="mb-2 h-8 w-44 max-w-[90vw]" />
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonLine className="h-10 w-44 shrink-0 rounded-lg" />
      </div>

      <SkeletonLine className="mb-4 h-5 w-full max-w-xl rounded-lg" />

      <SkeletonTable rows={5} columns={6} minWidthClass="min-w-[720px]" />
    </main>
  );
}
