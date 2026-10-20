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

export type MexicoWhatsAppDestinationCheck = {
  toFormatted: string;
  validMexicoFormat: boolean;
  expectedPattern: string;
  digitsAfterCountryCode: number;
  nationalNumber: string;
};

export type TwilioMessageSendMeta = {
  sid: string;
  status: string | null;
  errorCode: number | null;
  errorMessage: string | null;
  to: string | null;
  from: string | null;
  dateCreated: string | null;
  /** Look up this SID under Twilio Console → Monitor → Logs → Messaging */
  consoleLookupSid: string;
};

export type ContentTemplateCheck = {
  contentSid: string;
  fetched: boolean;
  friendlyName?: string | null;
  language?: string | null;
  whatsappApprovalStatus?: string | null;
  note: string;
};

export type SendDodaLiberadoWhatsAppResult = {
  sid: string;
  record: WhatsAppMessageRecord | null;
  twilio: TwilioMessageSendMeta;
  destination: MexicoWhatsAppDestinationCheck;
  contentTemplate: ContentTemplateCheck;
};

/** Validates `whatsapp:+52` + 10 national digits (Mexico mobile). */
export function inspectMexicoWhatsAppDestination(
  toFormatted: string,
): MexicoWhatsAppDestinationCheck {
  const digits = toFormatted.replace(/^whatsapp:/i, "").replace(/\D/g, "");
  const national = digits.startsWith("52") ? digits.slice(2) : digits;

  return {
    toFormatted,
    validMexicoFormat:
      toFormatted.startsWith("whatsapp:+52") && national.length === 10,
    expectedPattern: "whatsapp:+52XXXXXXXXXX (10 digits after country code 52)",
    digitsAfterCountryCode: national.length,
    nationalNumber: national,
  };
}

export function twilioMessagingConsoleHint(messageSid: string): string {
  return `Twilio Console → Monitor → Logs → Messaging → search Message SID ${messageSid}`;
}

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

function extractTwilioMessageMeta(
  message: {
    sid?: string;
    status?: string;
    errorCode?: number | null;
    errorMessage?: string | null;
    to?: string;
    from?: string;
    dateCreated?: Date;
  },
  sidFallback: string,
): TwilioMessageSendMeta {
  const sid = message.sid ?? sidFallback;
  return {
    sid,
    status: message.status ?? null,
    errorCode: message.errorCode ?? null,
    errorMessage: message.errorMessage ?? null,
    to: message.to ?? null,
    from: message.from ?? null,
    dateCreated: message.dateCreated
      ? message.dateCreated.toISOString()
      : null,
    consoleLookupSid: sid,
  };
}

async function logContentTemplateApproval(
  contentSid: string,
): Promise<ContentTemplateCheck> {
  const base: ContentTemplateCheck = {
    contentSid,
    fetched: false,
    note:
      'Verify in Twilio Console → Content Template Builder that "doda_liberado" status is Approved',
  };

  try {
    const client = getTwilioClient();
    const content = await client.content.v1.contents(contentSid).fetch();
    const contentJson = content.toJSON() as Record<string, unknown>;
    const approvalRequests = contentJson.approval_requests as
      | { whatsapp?: { status?: string } }
      | Array<{ status?: string }>
      | undefined;

    let whatsappStatus: string | null = null;
    if (approvalRequests && !Array.isArray(approvalRequests)) {
      whatsappStatus = approvalRequests.whatsapp?.status ?? null;
    } else if (Array.isArray(approvalRequests) && approvalRequests[0]?.status) {
      whatsappStatus = approvalRequests[0].status;
    }

    const check: ContentTemplateCheck = {
      contentSid,
      fetched: true,
      friendlyName: content.friendlyName ?? null,
      language: content.language ?? null,
      whatsappApprovalStatus: whatsappStatus,
      note: whatsappStatus
        ? `WhatsApp approval status from API: ${whatsappStatus}`
        : base.note,
    };

    console.log("[twilio] Content template (doda_liberado)", check);
    return check;
  } catch (error) {
    console.warn(
      "[twilio] Could not fetch content template approval via API — check Console manually",
      error,
    );
    return base;
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
  const destination = inspectMexicoWhatsAppDestination(to);
  console.log("[twilio] Destination format check", destination);
  if (!destination.validMexicoFormat) {
    console.warn(
      "[twilio] Destination may be invalid for MX WhatsApp — expected whatsapp:+52 + 10 digits",
    );
  }

  const contentTemplate = await logContentTemplateApproval(contentSid);
  if (
    contentTemplate.fetched &&
    contentTemplate.whatsappApprovalStatus &&
    contentTemplate.whatsappApprovalStatus.toLowerCase() !== "approved"
  ) {
    console.warn(
      "[twilio] Content template WhatsApp status is not Approved:",
      contentTemplate.whatsappApprovalStatus,
    );
  }

  console.log("[twilio] Attempting to send to:", to);
  console.log("[twilio] contentVariables:", contentVariables);

  let result;
  const client = getTwilioClient();
  try {
    result = await client.messages.create({
      from,
      to,
      contentSid,
      contentVariables,
    });
    console.log("[twilio] Response (create):", serializeTwilioMessage(result));
  } catch (error) {
    logTwilioError(error);
    throw error;
  }

  const sid = result.sid;
  if (!sid) {
    throw new Error("Twilio no devolvió SID del mensaje");
  }

  console.log("[twilio] Message SID:", sid);
  console.log("[twilio] Message status (create):", result.status ?? "unknown");
  console.log("[twilio]", twilioMessagingConsoleHint(sid));

  let latest = result;
  try {
    latest = await client.messages(sid).fetch();
    console.log("[twilio] Response (fetch):", serializeTwilioMessage(latest));
    console.log("[twilio] Message status (fetch):", latest.status ?? "unknown");
    if (latest.errorCode || latest.errorMessage) {
      console.error("[twilio] Message delivery error from Twilio", {
        errorCode: latest.errorCode,
        errorMessage: latest.errorMessage,
      });
    }
  } catch (fetchError) {
    console.warn("[twilio] Could not re-fetch message by SID after send", fetchError);
  }

  const twilioMeta = extractTwilioMessageMeta(latest, sid);
  console.log(
    "[twilio] Full send summary:",
    JSON.stringify({ twilio: twilioMeta, destination, contentTemplate }),
  );

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
    twilio: twilioMeta,
    destination,
    contentTemplate,
  };
}
