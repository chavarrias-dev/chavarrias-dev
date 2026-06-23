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
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-medium tracking-tight text-slate-900">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
          {progress ? (
            <div className="text-xs font-medium text-slate-600">{progress}</div>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
