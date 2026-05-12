type TotalClientsCardProps = {
  total: number;
  /** Clients created since the first day of the current month (UTC). */
  thisMonth: number;
};

export function TotalClientsCard({ total, thisMonth }: TotalClientsCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 font-poppins shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium tracking-tight text-slate-900">
          Total de clientes
        </h3>
        <svg
          className="h-7 w-7 shrink-0 text-[#227DE8]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.813-2.513M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      </div>
      <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 leading-tight">
        {total}
      </p>
      {thisMonth > 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-medium text-[#227DE8]">+{thisMonth}</span> este
          mes
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Sin altas este mes</p>
      )}
    </div>
  );
}
