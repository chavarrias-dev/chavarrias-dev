"use server";

import { redirect } from "next/navigation";
import { sendWhatsAppMessage, type WhatsAppMessageRecord } from "@/lib/whatsapp";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SendWhatsAppResult =
  | { ok: true; message: WhatsAppMessageRecord }
  | { ok: false; error: string };

export async function sendWhatsAppMessageAction(
  to: string,
  message: string,
): Promise<SendWhatsAppResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    return {
      ok: false,
      error: "No tienes permiso para enviar mensajes de WhatsApp",
    };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, error: "El mensaje no puede estar vacío" };
  }
  if (!to.trim()) {
    return { ok: false, error: "Número de destino requerido" };
  }

  try {
    const saved = await sendWhatsAppMessage(to.trim(), trimmed);
    if (!saved) {
      return {
        ok: false,
        error: "El mensaje se envió pero no se pudo guardar en el historial",
      };
    }
    return { ok: true, message: saved };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al enviar el mensaje de WhatsApp",
    };
  }
}
