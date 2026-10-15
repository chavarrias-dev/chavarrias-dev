import { after } from "next/server";
import { NextResponse } from "next/server";
import { processWhatsAppDodaMedia } from "@/lib/whatsapp-doda";
import {
  applyWhatsAppStatusUpdate,
  parseTwilioWhatsAppAddress,
  saveIncomingWhatsAppMessage,
  sendWhatsAppMessage,
  type WhatsAppIncomingMedia,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 120;

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twimlResponse() {
  return new Response(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function inferFilename(
  kind: "image" | "document",
  mimeType: string,
): string {
  if (kind === "document" && mimeType === "application/pdf") {
    return "doda.pdf";
  }
  if (mimeType === "image/png") return "doda.png";
  if (mimeType === "image/webp") return "doda.webp";
  return "doda.jpg";
}

function extractTwilioMedia(
  formData: FormData,
  from: string,
  messageSid: string,
): WhatsAppIncomingMedia[] {
  const numMedia = Number.parseInt(String(formData.get("NumMedia") ?? "0"), 10);
  if (!Number.isFinite(numMedia) || numMedia <= 0) {
    return [];
  }

  const results: WhatsAppIncomingMedia[] = [];

  for (let index = 0; index < numMedia; index += 1) {
    const mediaUrl = String(formData.get(`MediaUrl${index}`) ?? "").trim();
    const contentType = String(
      formData.get(`MediaContentType${index}`) ?? "",
    ).trim();
    if (!mediaUrl) {
      continue;
    }

    const mimeType = contentType || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    if (!isImage && !isPdf) {
      continue;
    }

    const kind: "image" | "document" = isImage ? "image" : "document";
    results.push({
      messageId: `${messageSid}-${index}`,
      from,
      mediaId: mediaUrl,
      mimeType,
      filename: inferFilename(kind, mimeType),
      kind,
    });
  }

  return results;
}

/** Twilio does not use GET verification (legacy Meta hub challenge). */
export async function GET() {
  return NextResponse.json({ ok: true, provider: "twilio" });
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const messageSid = String(formData.get("MessageSid") ?? "").trim();
  const messageStatus = String(formData.get("MessageStatus") ?? "").trim();
  const fromRaw = String(formData.get("From") ?? "");
  const toRaw = String(formData.get("To") ?? "");
  const body = String(formData.get("Body") ?? "");

  if (messageSid && messageStatus && !fromRaw) {
    after(async () => {
      await applyWhatsAppStatusUpdate({
        waMessageId: messageSid,
        status: messageStatus,
      });
    });
    return twimlResponse();
  }

  const from = parseTwilioWhatsAppAddress(fromRaw);
  const to = parseTwilioWhatsAppAddress(toRaw);

  if (!messageSid || !from) {
    return NextResponse.json(
      { error: "Missing MessageSid or From" },
      { status: 400 },
    );
  }

  const mediaMessages = extractTwilioMedia(formData, from, messageSid);
  const incomingText =
    body.trim() ||
    (mediaMessages.length > 0
      ? mediaMessages[0]!.kind === "image"
        ? "📷 Imagen"
        : "📄 Documento"
      : "");

  after(async () => {
    await saveIncomingWhatsAppMessage({
      messageId: messageSid,
      from,
      to: to || null,
      text: incomingText,
      type: mediaMessages.length > 0 ? "media" : "text",
    });

    for (const media of mediaMessages) {
      await processWhatsAppDodaMedia(media);
    }

    if (mediaMessages.length === 0 && body.trim()) {
      try {
        await sendWhatsAppMessage(
          from,
          [
            "Hola 👋",
            "",
            "Para consultar un DODA en el SAT, envíanos el archivo como *imagen* o *PDF* con el código QR visible.",
          ].join("\n"),
        );
      } catch (error) {
        console.error("[whatsapp-webhook] reply failed", from, error);
      }
    }
  });

  return twimlResponse();
}
