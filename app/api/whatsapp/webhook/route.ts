import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  extractWhatsAppIncomingMedia,
  sendWhatsAppTextMessage,
  verifyWhatsAppWebhook,
} from "@/lib/whatsapp";
import { processWhatsAppDodaMedia } from "@/lib/whatsapp-doda";

export const runtime = "nodejs";
export const maxDuration = 120;

type WhatsAppWebhookBody = Parameters<typeof extractWhatsAppIncomingMedia>[0];

export async function GET(req: Request) {
  const challenge = verifyWhatsAppWebhook(new URL(req.url).searchParams);
  if (!challenge) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  let body: WhatsAppWebhookBody;
  try {
    body = (await req.json()) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mediaMessages = extractWhatsAppIncomingMedia(body);

  after(async () => {
    for (const media of mediaMessages) {
      await processWhatsAppDodaMedia(media);
    }

    const plainTextSenders = new Set<string>();
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          const from = message.from?.trim();
          if (!from || message.type === "image" || message.type === "document") {
            continue;
          }
          if (!plainTextSenders.has(from)) {
            plainTextSenders.add(from);
            try {
              await sendWhatsAppTextMessage(
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
        }
      }
    }
  });

  return NextResponse.json({ ok: true });
}
