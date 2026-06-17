import "server-only";

const DEFAULT_GRAPH_VERSION = "v21.0";

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
  const token = process.env.WHATSAPP_TOKEN?.trim();
  if (!token) {
    throw new WhatsAppConfigError("WHATSAPP_TOKEN is not configured");
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
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!verifyToken) {
    throw new WhatsAppConfigError("WHATSAPP_VERIFY_TOKEN is not configured");
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

export async function sendWhatsAppTextMessage(
  to: string,
  body: string,
): Promise<void> {
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
}

export type WhatsAppIncomingMedia = {
  messageId: string;
  from: string;
  mediaId: string;
  mimeType: string;
  filename: string;
  kind: "image" | "document";
};

type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          image?: { id?: string; mime_type?: string };
          document?: {
            id?: string;
            mime_type?: string;
            filename?: string;
          };
        }>;
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
