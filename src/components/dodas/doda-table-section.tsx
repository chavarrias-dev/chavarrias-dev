type DodaTableSectionProps = {
  title: string;
  description?: string;
  progress?: React.ReactNode;
  children: React.ReactNode;
};

export function DodaTableSection({
  title,
  description,
  progress,
  children,
}: DodaTableSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium tracking-tight text-slate-900 sm:text-base">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
                {description}
              </p>
            ) : null}
          </div>
          {progress ? (
            <div className="text-xs font-medium text-slate-600">{progress}</div>
          ) : null}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
