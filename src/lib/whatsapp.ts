import "server-only";

import { findClientIdByPhone } from "@/lib/phone-match";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formatTwilioWhatsAppTo,
  getTwilioClient,
  getTwilioWhatsAppFrom,
  TwilioConfigError,
} from "@/lib/twilio";

/** Placeholder for "our side" of a conversation — the UI only displays the counterpart's number. */
const OUR_NUMBER_PLACEHOLDER = "business";

export class WhatsAppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigError";
  }
}

export { TwilioConfigError };

/** Strips `whatsapp:+` prefix; returns digits only (e.g. 5218994214152). */
export function parseTwilioWhatsAppAddress(value: string): string {
  return value.replace(/^whatsapp:/i, "").replace(/\D/g, "");
}

export { formatTwilioWhatsAppTo };

export type WhatsAppMediaDownload = {
  buffer: Buffer;
  mimeType: string;
};

/**
 * Downloads media from a Twilio MediaUrl (Basic auth with account credentials).
 * `mediaRef` must be a full HTTPS URL from the webhook.
 */
export async function downloadWhatsAppMedia(
  mediaRef: string,
): Promise<WhatsAppMediaDownload> {
  if (!mediaRef.startsWith("http")) {
    throw new Error(
      "La descarga de archivos de WhatsApp requiere una MediaUrl de Twilio",
    );
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) {
    throw new WhatsAppConfigError("Credenciales Twilio no configuradas");
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const fileRes = await fetch(mediaRef, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!fileRes.ok) {
    const body = await fileRes.text();
    throw new Error(
      `No se pudo descargar el archivo de WhatsApp (${fileRes.status}): ${body.slice(0, 200)}`,
    );
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType:
      fileRes.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** Sends a WhatsApp text message via Twilio. Returns the message SID. */
export async function sendWhatsAppTextMessage(
  to: string,
  body: string,
): Promise<string | null> {
  const client = getTwilioClient();
  const result = await client.messages.create({
    from: getTwilioWhatsAppFrom(),
    to: formatTwilioWhatsAppTo(to),
    body,
  });
  return result.sid ?? null;
}

export type WhatsAppIncomingMedia = {
  messageId: string;
  from: string;
  /** Twilio MediaUrl (HTTPS). */
  mediaId: string;
  mimeType: string;
  filename: string;
  kind: "image" | "document";
};

export type WhatsAppIncomingMessage = {
  messageId: string;
  from: string;
  to: string | null;
  text: string;
  type: string;
};

export type WhatsAppStatusUpdate = {
  waMessageId: string;
  status: string;
};

export type WhatsAppMessageDirection = "incoming" | "outgoing";

export type WhatsAppMessageRecord = {
  id: string;
  wa_message_id: string | null;
  from_number: string;
  to_number: string;
  message: string;
  direction: WhatsAppMessageDirection;
  status: string | null;
  client_id: string | null;
  created_at: string;
};

const WHATSAPP_MESSAGE_SELECT =
  "id, wa_message_id, from_number, to_number, message, direction, status, client_id, created_at";

/** Saves an incoming message to `whatsapp_messages`, matching it to a client by phone. */
export async function saveIncomingWhatsAppMessage(
  incoming: WhatsAppIncomingMessage,
): Promise<WhatsAppMessageRecord | null> {
  const supabase = createSupabaseAdminClient();
  const clientId = await findClientIdByPhone(supabase, incoming.from);

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .upsert(
      {
        wa_message_id: incoming.messageId,
        from_number: incoming.from,
        to_number: incoming.to ?? OUR_NUMBER_PLACEHOLDER,
        message: incoming.text,
        direction: "incoming",
        status: null,
        client_id: clientId,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true },
    )
    .select(WHATSAPP_MESSAGE_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[whatsapp] failed to save incoming message", error);
    return null;
  }

  return (data as WhatsAppMessageRecord | null) ?? null;
}

/** Applies a delivery status update from Twilio status callbacks. */
export async function applyWhatsAppStatusUpdate(
  update: WhatsAppStatusUpdate,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("whatsapp_messages")
    .update({ status: update.status })
    .eq("wa_message_id", update.waMessageId);

  if (error) {
    console.error(
      "[whatsapp] failed to update message status",
      update.waMessageId,
      error,
    );
  }
}

/**
 * Sends a WhatsApp text message and records it in `whatsapp_messages`.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<WhatsAppMessageRecord | null> {
  const waMessageId = await sendWhatsAppTextMessage(to, message);

  const supabase = createSupabaseAdminClient();
  const clientId = await findClientIdByPhone(supabase, to);

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      wa_message_id: waMessageId,
      from_number: OUR_NUMBER_PLACEHOLDER,
      to_number: to.replace(/\D/g, ""),
      message,
      direction: "outgoing",
      status: "sent",
      client_id: clientId,
    })
    .select(WHATSAPP_MESSAGE_SELECT)
    .single();

  if (error || !data) {
    console.error("[whatsapp] failed to save outgoing message", error);
    return null;
  }

  return data as WhatsAppMessageRecord;
}
