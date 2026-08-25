import { normalizePhoneDigits } from "@/lib/phone-match";
import type { WhatsAppMessageRecord } from "@/lib/whatsapp";

export type WhatsAppConversationSummary = {
  key: string;
  clientId: string | null;
  phoneNumber: string;
  displayName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

function counterpartNumber(message: WhatsAppMessageRecord): string {
  return message.direction === "incoming"
    ? message.from_number
    : message.to_number;
}

export function conversationKeyFor(message: WhatsAppMessageRecord): string {
  return (
    message.client_id ?? `phone:${normalizePhoneDigits(counterpartNumber(message))}`
  );
}

/**
 * Groups messages into conversations by client (when matched) or phone number,
 * with an unread count of incoming messages received after the last outgoing reply.
 */
export function buildWhatsAppConversations(
  messages: WhatsAppMessageRecord[],
  clientNamesById: Map<string, string>,
): WhatsAppConversationSummary[] {
  const grouped = new Map<string, WhatsAppMessageRecord[]>();

  for (const message of messages) {
    const key = conversationKeyFor(message);
    const list = grouped.get(key);
    if (list) {
      list.push(message);
    } else {
      grouped.set(key, [message]);
    }
  }

  const summaries: WhatsAppConversationSummary[] = [];

  for (const [key, groupMessages] of grouped) {
    const sorted = [...groupMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const last = sorted[sorted.length - 1]!;

    const lastOutgoing = [...sorted]
      .reverse()
      .find((message) => message.direction === "outgoing");

    const unreadCount = sorted.filter(
      (message) =>
        message.direction === "incoming" &&
        (!lastOutgoing ||
          new Date(message.created_at).getTime() >
            new Date(lastOutgoing.created_at).getTime()),
    ).length;

    const clientId = groupMessages.find((message) => message.client_id)?.client_id ?? null;
    const phoneNumber = counterpartNumber(last);

    summaries.push({
      key,
      clientId,
      phoneNumber,
      displayName: (clientId && clientNamesById.get(clientId)) || phoneNumber,
      lastMessage: last.message,
      lastMessageAt: last.created_at,
      unreadCount,
    });
  }

  return summaries.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export function messagesForConversation(
  messages: WhatsAppMessageRecord[],
  key: string,
): WhatsAppMessageRecord[] {
  return messages
    .filter((message) => conversationKeyFor(message) === key)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
