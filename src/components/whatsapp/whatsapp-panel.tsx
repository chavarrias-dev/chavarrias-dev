"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Search, Send } from "lucide-react";
import { sendWhatsAppMessageAction } from "../../../app/dashboard/whatsapp/actions";
import { formatMessageTime } from "@/lib/messages";
import {
  buildWhatsAppConversations,
  messagesForConversation,
  type WhatsAppConversationSummary,
} from "@/lib/whatsapp-conversations";
import type { WhatsAppMessageRecord } from "@/lib/whatsapp";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type WhatsAppClient = {
  id: string;
  full_name: string;
  phone: string | null;
};

type WhatsAppPanelProps = {
  initialMessages: WhatsAppMessageRecord[];
  clients: WhatsAppClient[];
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Falló",
};

function mergeMessage(
  list: WhatsAppMessageRecord[],
  incoming: WhatsAppMessageRecord,
): WhatsAppMessageRecord[] {
  const existingIndex = list.findIndex(
    (item) =>
      item.id === incoming.id ||
      (item.wa_message_id && item.wa_message_id === incoming.wa_message_id),
  );
  if (existingIndex === -1) {
    return [...list, incoming].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  const next = [...list];
  next[existingIndex] = incoming;
  return next;
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function WhatsAppPanel({ initialMessages, clients }: WhatsAppPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    searchParams.get("conv"),
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const clientNamesById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.full_name])),
    [clients],
  );

  const conversations = useMemo(
    () => buildWhatsAppConversations(messages, clientNamesById),
    [messages, clientNamesById],
  );

  const normalizedSearch = normalizeSearchQuery(searchQuery);

  const filteredConversations = useMemo(() => {
    if (!normalizedSearch) {
      return conversations;
    }
    return conversations.filter(
      (conversation) =>
        conversation.displayName.toLowerCase().includes(normalizedSearch) ||
        conversation.phoneNumber.toLowerCase().includes(normalizedSearch) ||
        conversation.lastMessage.toLowerCase().includes(normalizedSearch),
    );
  }, [conversations, normalizedSearch]);

  const selectedMessages = useMemo(() => {
    if (!selectedKey) {
      return [];
    }
    return messagesForConversation(messages, selectedKey);
  }, [messages, selectedKey]);

  const selectedConversation = selectedKey
    ? conversations.find((conversation) => conversation.key === selectedKey)
    : null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedMessages, scrollToBottom]);

  useEffect(() => {
    const fromUrl = searchParams.get("conv");
    if (fromUrl) {
      setSelectedKey(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("whatsapp_messages:dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          setMessages((prev) => mergeMessage(prev, payload.new as WhatsAppMessageRecord));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          setMessages((prev) => mergeMessage(prev, payload.new as WhatsAppMessageRecord));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const selectConversation = (key: string) => {
    setSelectedKey(key);
    router.replace(`/dashboard/whatsapp?conv=${encodeURIComponent(key)}`, {
      scroll: false,
    });
  };

  const handleSend = () => {
    if (!selectedConversation || !draft.trim()) {
      return;
    }

    setError(null);
    const content = draft;
    setDraft("");

    startTransition(async () => {
      const result = await sendWhatsAppMessageAction(
        selectedConversation.phoneNumber,
        content,
      );
      if (!result.ok) {
        setError(result.error);
        setDraft(content);
        return;
      }

      setMessages((prev) => mergeMessage(prev, result.message));
    });
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:h-[calc(100vh-8.5rem)] md:min-h-[560px]">
      <aside
        className={`flex w-full flex-col border-r border-slate-200 bg-slate-50/60 md:w-80 lg:w-96 shrink-0 ${
          selectedConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:py-4">
          <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
            WhatsApp
          </h1>
          <div className="relative mt-2.5 sm:mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar conversación…"
              className="form-field w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Aún no hay conversaciones de WhatsApp.
            </p>
          ) : filteredConversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No se encontraron conversaciones.
            </p>
          ) : (
            <ul>
              {filteredConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.key}
                  conversation={conversation}
                  active={conversation.key === selectedKey}
                  onSelect={() => selectConversation(conversation.key)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section
        className={`min-w-0 flex-1 flex-col bg-[#f8fafc] ${
          selectedConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedKey(null);
                  router.replace("/dashboard/whatsapp", { scroll: false });
                }}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 md:hidden active:scale-95"
                aria-label="Volver a la lista de conversaciones"
                title="Volver"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  {selectedConversation.displayName}
                </h2>
                <p className="truncate text-xs text-slate-500">
                  {selectedConversation.phoneNumber}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
              {selectedMessages.length === 0 ? (
                <p className="text-center text-sm text-slate-500">
                  Sin mensajes todavía.
                </p>
              ) : (
                selectedMessages.map((message) => {
                  const isMine = message.direction === "outgoing";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%] ${
                          isMine
                            ? "rounded-br-md bg-[#227DE8] text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.message}
                        </p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMine ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {formatMessageTime(message.created_at)}
                          {isMine && message.status
                            ? ` · ${STATUS_LABELS[message.status] ?? message.status}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {error ? (
              <p className="animate-error-in px-5 pb-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={1}
                  placeholder="Escribe un mensaje…"
                  className="max-h-32 min-h-10 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isPending || !draft.trim()}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#227DE8] px-4 text-sm font-medium text-white transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Enviar mensaje"
                >
                  <Send className="size-4" aria-hidden />
                  Enviar
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="mb-3 size-10 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-700">
              Selecciona una conversación
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Elige un contacto del panel izquierdo para ver el historial.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: WhatsAppConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${
          active ? "bg-[#227DE8]/10" : "hover:bg-white"
        }`}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {conversation.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-900">
              {conversation.displayName}
            </p>
            <span className="shrink-0 text-[10px] text-slate-400">
              {formatMessageTime(conversation.lastMessageAt)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-slate-500">
              {conversation.lastMessage}
            </p>
            {conversation.unreadCount > 0 ? (
              <span className="badge-pulse-subtle inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
