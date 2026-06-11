import Link from "next/link";
import {
  formatTimeAgo,
  messagePreview,
  senderInitials,
  type InboxMessagePreview,
} from "@/lib/messages";

type RecentInboxCardProps = {
  messages: InboxMessagePreview[];
  unreadCount: number;
};

export function RecentInboxCard({
  messages,
  unreadCount,
}: RecentInboxCardProps) {
  return (
    <div className="card-hover-lift animate-card-in card-stagger-2 flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 font-poppins shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-sm font-medium tracking-tight text-slate-900">
            Bandeja de entrada
          </h3>
          {unreadCount > 0 ? (
            <span className="badge-pulse-subtle inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>
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
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>

      {messages.length === 0 ? (
        <div className="mt-3 flex flex-1 flex-col justify-center">
          <p className="text-sm text-slate-500">No tienes mensajes nuevos</p>
        </div>
      ) : (
        <ul className="mt-3 flex-1 space-y-0 border-t border-slate-100 pt-2">
          {messages.map((message) => (
            <li key={message.id}>
              <Link
                href={`/dashboard/messages?user=${encodeURIComponent(message.senderId)}`}
                className="flex items-start gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-slate-50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#227DE8]/15 text-[11px] font-semibold text-[#227DE8]">
                  {senderInitials(message.senderName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        message.read
                          ? "font-medium text-slate-700"
                          : "font-semibold text-slate-900"
                      }`}
                    >
                      {message.senderName}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatTimeAgo(message.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {!message.read ? (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-[#227DE8]"
                        aria-label="No leído"
                      />
                    ) : null}
                    <p className="truncate text-xs text-slate-500">
                      {messagePreview(message.content)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/dashboard/messages"
        className="mt-3 inline-flex text-xs font-medium text-[#227DE8] transition hover:text-[#1a6ed4]"
      >
        Ver todos
      </Link>
    </div>
  );
}
