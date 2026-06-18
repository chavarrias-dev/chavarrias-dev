"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { NotificationRecord } from "@/lib/doda-types";
import { dodaNotificationHref } from "@/lib/doda-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 45_000;

type DashboardNotificationsBellProps = {
  currentUserId: string;
};

function formatNotificationTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardNotificationsBell({
  currentUserId,
}: DashboardNotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    const response = await fetch("/api/notifications/unread-count");
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { count?: number };
    setUnreadCount(payload.count ?? 0);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=12");
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        notifications?: NotificationRecord[];
      };
      setNotifications(payload.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, POLL_INTERVAL_MS);

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void loadUnreadCount();
          if (open) {
            void loadNotifications();
          }
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadUnreadCount, loadNotifications, open]);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [open, loadNotifications]);

  async function handleNotificationClick(notification: NotificationRecord) {
    await fetch(`/api/notifications/${notification.id}/read`, {
      method: "PATCH",
    });

    setOpen(false);
    setUnreadCount((count) => Math.max(0, count - (notification.is_read ? 0 : 1)));
    setNotifications((current) =>
      current.map((row) =>
        row.id === notification.id ? { ...row, is_read: true } : row,
      ),
    );

    if (notification.type === "doda_status_changed") {
      router.push(dodaNotificationHref(notification.related_id));
      return;
    }

    router.refresh();
  }

  return (
    <details
      className="group relative"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <Bell className="size-4 shrink-0 text-slate-600" aria-hidden />
        <span className="hidden sm:inline">Avisos</span>
        {unreadCount > 0 ? (
          <span className="badge-pulse-subtle inline-flex min-w-5 items-center justify-center rounded-full bg-[#227DE8] px-1.5 py-0.5 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-sm font-medium text-slate-900">Notificaciones</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Cambios de estatus en DODAs monitoreados
          </p>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Cargando…</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            No hay notificaciones recientes.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                    notification.is_read ? "opacity-70" : "bg-sky-50/40"
                  }`}
                >
                  <p className="text-sm text-slate-800">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNotificationTime(notification.created_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
