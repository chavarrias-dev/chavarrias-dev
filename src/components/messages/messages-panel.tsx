"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquarePlus, Send, X } from "lucide-react";
import {
  markConversationAsRead,
  sendMessage,
} from "../../../app/dashboard/messages/actions";
import {
  buildConversations,
  canMessageUser,
  displayName,
  formatMessageTime,
  type ConversationSummary,
  type MessageProfile,
  type MessageRecord,
} from "@/lib/messages";
import type { ProfileRole } from "@/lib/supabase/profile-role";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type MessagesPanelProps = {
  currentUserId: string;
  currentUserRole: ProfileRole | null;
  initialMessages: MessageRecord[];
  allProfiles: MessageProfile[];
};

function mergeMessage(list: MessageRecord[], incoming: MessageRecord): MessageRecord[] {
  if (list.some((item) => item.id === incoming.id)) {
    return list;
  }
  return [...list, incoming].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function MessagesPanel({
  currentUserId,
  currentUserRole,
  initialMessages,
  allProfiles,
}: MessagesPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    searchParams.get("user"),
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [isPending, startTransition] = useTransition();

  const profilesById = useMemo(
    () => new Map(allProfiles.map((profile) => [profile.id, profile])),
    [allProfiles],
  );

  const contacts = useMemo(
    () =>
      allProfiles.filter((contact) =>
        canMessageUser(
          currentUserRole,
          contact.role,
          currentUserId,
          contact.id,
        ),
      ),
    [allProfiles, currentUserRole, currentUserId],
  );

  const conversations = useMemo(
    () => buildConversations(messages, profilesById, currentUserId),
    [messages, profilesById, currentUserId],
  );

  const selectedMessages = useMemo(() => {
    if (!selectedPartnerId) {
      return [];
    }
    return messages.filter(
      (message) =>
        (message.sender_id === currentUserId &&
          message.receiver_id === selectedPartnerId) ||
        (message.sender_id === selectedPartnerId &&
          message.receiver_id === currentUserId),
    );
  }, [messages, selectedPartnerId, currentUserId]);

  const selectedPartner = selectedPartnerId
    ? profilesById.get(selectedPartnerId)
    : null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedMessages, scrollToBottom]);

  useEffect(() => {
    const partnerFromUrl = searchParams.get("user");
    if (partnerFromUrl) {
      setSelectedPartnerId(partnerFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedPartnerId) {
      return;
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.sender_id === selectedPartnerId &&
        message.receiver_id === currentUserId &&
        !message.read
          ? { ...message, read: true }
          : message,
      ),
    );

    void markConversationAsRead(selectedPartnerId);
  }, [selectedPartnerId, currentUserId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`messages:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incoming = payload.new as MessageRecord;
          const isMine =
            incoming.sender_id === currentUserId ||
            incoming.receiver_id === currentUserId;

          if (!isMine) {
            return;
          }

          setMessages((prev) => mergeMessage(prev, incoming));

          if (
            incoming.sender_id !== currentUserId &&
            incoming.receiver_id === currentUserId &&
            incoming.sender_id === selectedPartnerId
          ) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === incoming.id
                  ? { ...message, read: true }
                  : message,
              ),
            );
            void markConversationAsRead(incoming.sender_id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updated = payload.new as MessageRecord;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === updated.id ? updated : message,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedPartnerId]);

  const selectConversation = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setShowNewConversation(false);
    router.replace(`/dashboard/messages?user=${encodeURIComponent(partnerId)}`, {
      scroll: false,
    });
  };

  const handleSend = () => {
    if (!selectedPartnerId || !draft.trim()) {
      return;
    }

    setError(null);
    const content = draft;
    setDraft("");

    startTransition(async () => {
      const result = await sendMessage(selectedPartnerId, content);
      if (!result.ok) {
        setError(result.error);
        setDraft(content);
        return;
      }

      setMessages((prev) => mergeMessage(prev, result.message));
    });
  };

  const startConversation = (partnerId: string) => {
    selectConversation(partnerId);
  };

  const canStartWith = contacts;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-full max-w-sm flex-col border-r border-slate-200 bg-slate-50/60 md:w-80">
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-medium text-slate-900">Mensajes</h1>
            <button
              type="button"
              onClick={() => setShowNewConversation((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#227DE8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#227DE8] transition hover:bg-[#227DE8]/5"
            >
              <MessageSquarePlus className="size-3.5" aria-hidden />
              Nueva
            </button>
          </div>
        </div>

        {showNewConversation ? (
          <div className="border-b border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Iniciar conversación
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {canStartWith.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay usuarios disponibles.
                </p>
              ) : (
                canStartWith.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => startConversation(contact.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">
                      {displayName(contact)}
                    </span>
                    <span className="text-[10px] uppercase text-slate-400">
                      {contact.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Aún no tienes conversaciones. Inicia una con el botón Nueva.
            </p>
          ) : (
            <ul>
              {conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.partnerId}
                  conversation={conversation}
                  active={conversation.partnerId === selectedPartnerId}
                  onSelect={() => selectConversation(conversation.partnerId)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#f8fafc]">
        {selectedPartnerId && selectedPartner ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-medium text-slate-900">
                  {displayName(selectedPartner)}
                </h2>
                <p className="text-xs capitalize text-slate-500">
                  {selectedPartner.role ?? "usuario"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerId(null);
                  router.replace("/dashboard/messages", { scroll: false });
                }}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                aria-label="Cerrar conversación"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
              {selectedMessages.length === 0 ? (
                <p className="text-center text-sm text-slate-500">
                  Envía el primer mensaje para iniciar la conversación.
                </p>
              ) : (
                selectedMessages.map((message) => {
                  const isMine = message.sender_id === currentUserId;
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
                          {message.content}
                        </p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMine ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {error ? (
              <p className="px-5 pb-2 text-sm text-red-600" role="alert">
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
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#227DE8] text-white transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Enviar mensaje"
                >
                  <Send className="size-4" aria-hidden />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageSquarePlus className="mb-3 size-10 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-700">
              Selecciona una conversación
            </p>
            <p className="mt-1 text-sm text-slate-500">
              O inicia una nueva desde el panel izquierdo.
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
  conversation: ConversationSummary;
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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#227DE8]/15 text-sm font-semibold text-[#227DE8]">
          {conversation.partnerName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-900">
              {conversation.partnerName}
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
              <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
