import "server-only";

import twilio from "twilio";
import { findClientIdByPhone } from "@/lib/phone-match";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppMessageRecord } from "@/lib/whatsapp";

export class TwilioConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwilioConfigError";
  }
}

/** Expected Content Template SID for `doda_liberado` (verify in env matches Twilio Console). */
export const EXPECTED_DODA_CONTENT_SID =
  "HX7f0f7b4521fd38bd37fa33cf2b8e3a0f";

export function getTwilioAccountSid(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!sid) {
    throw new TwilioConfigError("TWILIO_ACCOUNT_SID is not configured");
  }
  if (sid.startsWith("SK")) {
    console.warn(
      "[twilio] TWILIO_ACCOUNT_SID starts with SK — use the Account SID (AC…), not an API Key SID",
    );
  }
  return sid;
}

export function getTwilioAuthToken(): string {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) {
    throw new TwilioConfigError("TWILIO_AUTH_TOKEN is not configured");
  }
  return token;
}

export function getTwilioWhatsAppFrom(): string {
  const from = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
  if (!from) {
    throw new TwilioConfigError("TWILIO_WHATSAPP_NUMBER is not configured");
  }
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}

export function getTwilioTemplateDodaSid(): string {
  const sid = process.env.TWILIO_TEMPLATE_DODA_SID?.trim();
  if (!sid) {
    throw new TwilioConfigError("TWILIO_TEMPLATE_DODA_SID is not configured");
  }
  return sid;
}

export function getTwilioClient() {
  return twilio(getTwilioAccountSid(), getTwilioAuthToken());
}

/** Ensures Twilio WhatsApp `to` format (`whatsapp:+521234567890`). */
export function formatTwilioWhatsAppTo(to: string): string {
  const trimmed = to.trim();
  if (trimmed.toLowerCase().startsWith("whatsapp:")) {
    const digits = trimmed.replace(/^whatsapp:/i, "").replace(/\D/g, "");
    if (!digits) {
      throw new TwilioConfigError("Número de WhatsApp destino inválido");
    }
    return `whatsapp:+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    throw new TwilioConfigError("Número de WhatsApp destino inválido");
  }
  return `whatsapp:+${digits}`;
}

export type SendDodaLiberadoWhatsAppInput = {
  to: string;
  integracion: string;
  pedimento: string;
  fecha: string;
};

export type SendDodaLiberadoWhatsAppResult = {
  sid: string;
  record: WhatsAppMessageRecord | null;
};

function serializeTwilioMessage(result: unknown): string {
  if (!result || typeof result !== "object") {
    return JSON.stringify(result);
  }
  const row = result as Record<string, unknown>;
  return JSON.stringify({
    sid: row.sid,
    status: row.status,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    to: row.to,
    from: row.from,
    dateCreated: row.dateCreated,
    messagingServiceSid: row.messagingServiceSid,
    numSegments: row.numSegments,
  });
}

function logTwilioError(error: unknown): void {
  console.error("[twilio] Error:", error);
  if (error && typeof error === "object") {
    const row = error as Record<string, unknown>;
    console.error(
      "[twilio] Error details:",
      JSON.stringify({
        code: row.code,
        message: row.message,
        moreInfo: row.moreInfo,
        status: row.status,
      }),
    );
  }
}

function buildDodaLiberadoLogMessage(input: SendDodaLiberadoWhatsAppInput): string {
  return [
    "🟢 DODA Liberado (plantilla doda_liberado)",
    `Integración: ${input.integracion}`,
    `Pedimento: ${input.pedimento}`,
    `Fecha: ${input.fecha}`,
  ].join("\n");
}

/**
 * Sends the Twilio Content Template `doda_liberado` and logs to `whatsapp_messages`.
 */
export async function sendDodaLiberadoWhatsApp(
  input: SendDodaLiberadoWhatsAppInput,
): Promise<SendDodaLiberadoWhatsAppResult> {
  const accountSid = getTwilioAccountSid();
  const from = getTwilioWhatsAppFrom();
  const contentSid = getTwilioTemplateDodaSid();
  const to = formatTwilioWhatsAppTo(input.to);

  const contentVariables = JSON.stringify({
    "1": input.integracion,
    "2": input.pedimento,
    "3": input.fecha,
  });

  console.log("[twilio] sendDodaLiberadoWhatsApp config", {
    accountSid,
    from,
    contentSid,
    expectedContentSid: EXPECTED_DODA_CONTENT_SID,
    contentSidMatchesExpected: contentSid === EXPECTED_DODA_CONTENT_SID,
    toRaw: input.to,
    toFormatted: to,
  });
  console.log("[twilio] Attempting to send to:", to);
  console.log("[twilio] contentVariables:", contentVariables);

  let result;
  try {
    const client = getTwilioClient();
    result = await client.messages.create({
      from,
      to,
      contentSid,
      contentVariables,
    });
    console.log("[twilio] Response:", serializeTwilioMessage(result));
  } catch (error) {
    logTwilioError(error);
    throw error;
  }

  const sid = result.sid;
  if (!sid) {
    throw new Error("Twilio no devolvió SID del mensaje");
  }

  const logMessage = buildDodaLiberadoLogMessage(input);
  const toDigits = input.to.replace(/\D/g, "");
  const supabase = createSupabaseAdminClient();
  const clientId = await findClientIdByPhone(supabase, toDigits);

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      wa_message_id: sid,
      from_number: "business",
      to_number: toDigits,
      message: logMessage,
      direction: "outgoing",
      status: "sent",
      client_id: clientId,
    })
    .select(
      "id, wa_message_id, from_number, to_number, message, direction, status, client_id, created_at",
    )
    .single();

  if (error) {
    console.error("[twilio] doda_liberado sent but failed to save history", error);
  }

  return {
    sid,
    record: (data as WhatsAppMessageRecord | null) ?? null,
  };
}
