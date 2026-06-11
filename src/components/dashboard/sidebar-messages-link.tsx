"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SidebarMessagesLinkProps = {
  collapsed: boolean;
  currentUserId: string;
  onNavigate?: () => void;
};

export function SidebarMessagesLink({
  collapsed,
  currentUserId,
  onNavigate,
}: SidebarMessagesLinkProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const active =
    pathname === "/dashboard/messages" ||
    pathname.startsWith("/dashboard/messages/");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function loadUnreadCount() {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", currentUserId)
        .eq("read", false);

      setUnreadCount(count ?? 0);
    }

    void loadUnreadCount();

    const channel = supabase
      .channel(`messages-unread:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          void loadUnreadCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <Link
      href="/dashboard/messages"
      title={collapsed ? "Mensajes" : undefined}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
        active
          ? "bg-[#227DE8]/10 text-[#227DE8]"
          : "text-slate-600 hover:bg-slate-100"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <span className="relative shrink-0">
        <MessageCircle
          className={`size-5 ${active ? "text-[#227DE8]" : "text-slate-500 group-hover:text-slate-700"}`}
          aria-hidden
        />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </span>
      <span
        className={`truncate transition-all duration-300 ${
          collapsed ? "sr-only w-0 opacity-0" : "opacity-100"
        }`}
      >
        Mensajes
      </span>
      {collapsed ? (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
          Mensajes
          {unreadCount > 0 ? ` (${unreadCount})` : ""}
        </span>
      ) : null}
    </Link>
  );
}
