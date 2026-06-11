import type { ProfileRole } from "@/lib/supabase/profile-role";

export type MessageRecord = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type MessageProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: ProfileRole | null;
};

export type ConversationSummary = {
  partnerId: string;
  partnerName: string;
  partnerRole: ProfileRole | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export function displayName(profile: MessageProfile): string {
  return profile.full_name?.trim() || profile.email;
}

export function canMessageUser(
  currentRole: ProfileRole | null,
  targetRole: ProfileRole | null,
  currentUserId: string,
  targetUserId: string,
): boolean {
  if (currentUserId === targetUserId) {
    return false;
  }

  if (currentRole === "admin" || currentRole === "empleado") {
    return true;
  }

  if (currentRole === "cliente") {
    return targetRole === "admin" || targetRole === "empleado";
  }

  return false;
}

export function buildConversations(
  messages: MessageRecord[],
  profilesById: Map<string, MessageProfile>,
  currentUserId: string,
): ConversationSummary[] {
  const byPartner = new Map<
    string,
    {
      lastMessage: MessageRecord;
      unreadCount: number;
    }
  >();

  for (const message of messages) {
    const partnerId =
      message.sender_id === currentUserId
        ? message.receiver_id
        : message.sender_id;

    const existing = byPartner.get(partnerId);
    const unreadIncrement =
      message.receiver_id === currentUserId && !message.read ? 1 : 0;

    if (!existing) {
      byPartner.set(partnerId, {
        lastMessage: message,
        unreadCount: unreadIncrement,
      });
      continue;
    }

    existing.unreadCount += unreadIncrement;

    if (
      new Date(message.created_at).getTime() >
      new Date(existing.lastMessage.created_at).getTime()
    ) {
      existing.lastMessage = message;
    }
  }

  return [...byPartner.entries()]
    .map(([partnerId, info]) => {
      const profile = profilesById.get(partnerId);
      return {
        partnerId,
        partnerName: profile ? displayName(profile) : "Usuario",
        partnerRole: profile?.role ?? null,
        lastMessage: info.lastMessage.content,
        lastMessageAt: info.lastMessage.created_at,
        unreadCount: info.unreadCount,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );
}

export function formatMessageTime(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type InboxMessagePreview = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  read: boolean;
  createdAt: string;
};

export function messagePreview(content: string, maxLength = 40): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

export function formatTimeAgo(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return "hace un momento";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `hace ${diffMin} min`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
  }

  return formatMessageTime(value);
}

export function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
