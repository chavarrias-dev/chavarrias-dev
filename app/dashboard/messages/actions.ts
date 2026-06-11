"use server";

import { redirect } from "next/navigation";
import {
  canMessageUser,
  type MessageRecord,
} from "@/lib/messages";
import { getUserRole, type ProfileRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SendMessageResult =
  | { ok: true; message: MessageRecord }
  | { ok: false; error: string };

async function getAuthedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  return { supabase, user, role };
}

export async function sendMessage(
  receiverId: string,
  content: string,
): Promise<SendMessageResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, error: "El mensaje no puede estar vacío" };
  }
  if (!receiverId.trim()) {
    return { ok: false, error: "Destinatario requerido" };
  }

  const { supabase, user, role } = await getAuthedUser();

  const { data: receiverProfile, error: receiverError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", receiverId)
    .maybeSingle<{ id: string; role: ProfileRole | null }>();

  if (receiverError || !receiverProfile) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  if (
    !canMessageUser(
      role,
      receiverProfile.role,
      user.id,
      receiverProfile.id,
    )
  ) {
    return { ok: false, error: "No tienes permiso para enviar mensajes a este usuario" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: trimmed,
      read: false,
    })
    .select("id, sender_id, receiver_id, content, read, created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Error al enviar el mensaje" };
  }

  return { ok: true, message: data as MessageRecord };
}

export async function markConversationAsRead(
  partnerId: string,
): Promise<void> {
  const { supabase, user } = await getAuthedUser();

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", user.id)
    .eq("sender_id", partnerId)
    .eq("read", false);
}

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("read", false);

  return count ?? 0;
}
