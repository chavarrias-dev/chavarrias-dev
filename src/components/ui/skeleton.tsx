import type { HTMLAttributes } from "react";

const pulse = "animate-pulse rounded bg-slate-200";

type SkeletonLineProps = HTMLAttributes<HTMLDivElement>;

export function SkeletonLine({ className = "", ...props }: SkeletonLineProps) {
  return (
    <div
      className={`${pulse} ${className}`.trim()}
      aria-hidden
      {...props}
    />
  );
}

type SkeletonCardProps = HTMLAttributes<HTMLDivElement>;

export function SkeletonCard({ className = "", children, ...props }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  minWidthClass?: string;
};

export function SkeletonTable({
  rows = 5,
  columns = 6,
  minWidthClass = "min-w-[720px]",
}: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${minWidthClass}`}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <SkeletonLine className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr
                key={r}
                className="border-b border-slate-100 transition-colors duration-200 last:border-0"
              >
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <SkeletonLine
                      className={`h-4 ${c === 0 ? "w-28" : c === columns - 1 ? "w-16" : "w-24"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Top bar placeholder (logo block + pill “nav” + actions) — use when a full chrome flash is desired. */
export function SkeletonNavbar() {
  return (
    <header className="border-b border-slate-200/80 bg-white shadow-sm">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 lg:gap-6">
          <SkeletonLine className="h-9 w-[180px] max-w-[220px]" />
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            {[1, 2, 3, 4].map((k) => (
              <SkeletonLine key={k} className="h-10 w-20 rounded-lg sm:w-24" />
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <SkeletonLine className="h-10 w-28 rounded-lg" />
          <SkeletonLine className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </header>
  );
}
