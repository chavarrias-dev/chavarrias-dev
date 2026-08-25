import "server-only";

import { findClientIdByPhone } from "@/lib/phone-match";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_GRAPH_VERSION = "v21.0";

/** Placeholder for "our side" of a conversation — the UI only displays the counterpart's number. */
const OUR_NUMBER_PLACEHOLDER = "business";

export class WhatsAppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigError";
  }
}

function graphVersion(): string {
  return process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
}

function graphBaseUrl(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}

export function getWhatsAppToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new WhatsAppConfigError("WHATSAPP_ACCESS_TOKEN is not configured");
  }
  return token;
}

export function getWhatsAppPhoneNumberId(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!phoneNumberId) {
    throw new WhatsAppConfigError("WHATSAPP_PHONE_NUMBER_ID is not configured");
  }
  return phoneNumberId;
}

export function getWhatsAppVerifyToken(): string {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!verifyToken) {
    throw new WhatsAppConfigError(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured",
    );
  }
  return verifyToken;
}

export function verifyWhatsAppWebhook(params: URLSearchParams): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return null;
  }

  let expectedToken: string;
  try {
    expectedToken = getWhatsAppVerifyToken();
  } catch {
    return null;
  }

  if (token !== expectedToken) {
    return null;
  }

  return challenge;
}

export type WhatsAppMediaDownload = {
  buffer: Buffer;
  mimeType: string;
};

export async function downloadWhatsAppMedia(
  mediaId: string,
): Promise<WhatsAppMediaDownload> {
  const token = getWhatsAppToken();
  const metaRes = await fetch(`${graphBaseUrl()}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!metaRes.ok) {
    const body = await metaRes.text();
    throw new Error(
      `No se pudo obtener metadata del archivo de WhatsApp (${metaRes.status}): ${body.slice(0, 200)}`,
    );
  }

  const meta = (await metaRes.json()) as {
    url?: string;
    mime_type?: string;
  };

  if (!meta.url) {
    throw new Error("WhatsApp no devolvió URL de descarga para el archivo");
  }

  const fileRes = await fetch(meta.url, {
    headers: {
      Authorization: `Bearer ${token}`,
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
      meta.mime_type ??
      fileRes.headers.get("content-type") ??
      "application/octet-stream",
  };
}

/** Sends a WhatsApp text message via the Graph API. Returns the WhatsApp message id. */
export async function sendWhatsAppTextMessage(
  to: string,
  body: string,
): Promise<string | null> {
  const token = getWhatsAppToken();
  const phoneNumberId = getWhatsAppPhoneNumberId();

  const res = await fetch(`${graphBaseUrl()}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `No se pudo enviar mensaje de WhatsApp (${res.status}): ${errorBody.slice(0, 300)}`,
    );
  }

  const payload = (await res.json()) as {
    messages?: Array<{ id?: string }>;
  };

  return payload.messages?.[0]?.id ?? null;
}

export type WhatsAppIncomingMedia = {
  messageId: string;
  from: string;
  mediaId: string;
  mimeType: string;
  filename: string;
  kind: "image" | "document";
};

type WhatsAppWebhookMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: {
    id?: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };
};

type WhatsAppWebhookStatus = {
  id?: string;
  status?: string;
};

export type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        messages?: WhatsAppWebhookMessage[];
        statuses?: WhatsAppWebhookStatus[];
      };
    }>;
  }>;
};

function inferFilename(
  kind: "image" | "document",
  mimeType: string,
  provided?: string,
): string {
  if (provided?.trim()) {
    return provided.trim();
  }
  if (kind === "document" && mimeType === "application/pdf") {
    return "doda.pdf";
  }
  if (mimeType === "image/png") return "doda.png";
  if (mimeType === "image/webp") return "doda.webp";
  return "doda.jpg";
}

/**
 * Extracts incoming image/document messages from a WhatsApp webhook payload.
 */
export function extractWhatsAppIncomingMedia(
  body: WhatsAppWebhookBody,
): WhatsAppIncomingMedia[] {
  if (body.object !== "whatsapp_business_account") {
    return [];
  }

  const results: WhatsAppIncomingMedia[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const from = message.from?.trim();
        const messageId = message.id?.trim();
        if (!from || !messageId) {
          continue;
        }

        if (message.type === "image" && message.image?.id) {
          const mimeType = message.image.mime_type ?? "image/jpeg";
          results.push({
            messageId,
            from,
            mediaId: message.image.id,
            mimeType,
            filename: inferFilename("image", mimeType),
            kind: "image",
          });
          continue;
        }

        if (message.type === "document" && message.document?.id) {
          const mimeType =
            message.document.mime_type ?? "application/octet-stream";
          results.push({
            messageId,
            from,
            mediaId: message.document.id,
            mimeType,
            filename: inferFilename(
              "document",
              mimeType,
              message.document.filename,
            ),
            kind: "document",
          });
        }
      }
    }
  }

  return results;
}

export type WhatsAppIncomingMessage = {
  messageId: string;
  from: string;
  to: string | null;
  text: string;
  type: string;
};

function describeIncomingMessage(message: WhatsAppWebhookMessage): string {
  switch (message.type) {
    case "text":
      return message.text?.body?.trim() || "";
    case "image":
      return message.image?.caption?.trim() || "📷 Imagen";
    case "document":
      return message.document?.filename
        ? `📄 ${message.document.filename}`
        : "📄 Documento";
    default:
      return `[${message.type ?? "mensaje"}]`;
  }
}

/**
 * Extracts every incoming message (any type) from a WhatsApp webhook payload,
 * for conversation history — unlike `extractWhatsAppIncomingMedia`, which only
 * pulls out image/document messages for DODA processing.
 */
export function extractWhatsAppIncomingMessages(
  body: WhatsAppWebhookBody,
): WhatsAppIncomingMessage[] {
  if (body.object !== "whatsapp_business_account") {
    return [];
  }

  const results: WhatsAppIncomingMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const to = change.value?.metadata?.display_phone_number ?? null;

      for (const message of change.value?.messages ?? []) {
        const from = message.from?.trim();
        const messageId = message.id?.trim();
        if (!from || !messageId) {
          continue;
        }

        results.push({
          messageId,
          from,
          to,
          text: describeIncomingMessage(message),
          type: message.type ?? "unknown",
        });
      }
    }
  }

  return results;
}

export type WhatsAppStatusUpdate = {
  waMessageId: string;
  status: string;
};

/** Extracts delivery status updates (sent/delivered/read/failed) for messages we sent. */
export function extractWhatsAppStatusUpdates(
  body: WhatsAppWebhookBody,
): WhatsAppStatusUpdate[] {
  if (body.object !== "whatsapp_business_account") {
    return [];
  }

  const results: WhatsAppStatusUpdate[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const waMessageId = status.id?.trim();
        const value = status.status?.trim();
        if (!waMessageId || !value) {
          continue;
        }
        results.push({ waMessageId, status: value });
      }
    }
  }

  return results;
}

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

/** Applies a delivery status update (from Meta's `statuses` webhook events) to a stored message. */
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
      to_number: to,
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
