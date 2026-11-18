import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  DODA_DISPLAY_TIMEZONE,
  normalizeDodaTimestamp,
} from "@/components/dodas/doda-display-utils";
import {
  normalizeWhatsAppIndividualRecipient,
} from "@/lib/doda-notification-config";
import { sendEvolutionText } from "@/lib/evolution-whatsapp";
import { dodaNotificationHref, DODA_RECORD_SELECT, type DodaRecord } from "@/lib/doda-types";
// Twilio WhatsApp desactivado en liberado automático — usar sendEvolutionText.
// import { sendDodaLiberadoWhatsApp } from "@/lib/twilio";

export type DodaResolvedNotificationInput = {
  dodaId: string;
  clienteId: string | null;
  createdBy: string | null;
  integrationNumber: string;
  previousStatus: string | null;
  newStatus: string;
  changedAt: string;
};

export type DodaResolvedNotificationResult = {
  notification_sent_at: string | null;
  notification_error: string | null;
};

type EmailRecipient = {
  label: string;
  email: string;
};

function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

function formatChangedAt(value: string): string {
  return new Date(normalizeDodaTimestamp(value)).toLocaleString("es-MX", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getResendFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "CRM Chavarrias <onboarding@resend.dev>"
  );
}

export function buildDodaLiberatedWhatsAppMessage(input: {
  integrationNumber: string;
  pedimento: string | null;
  tipoPedimento: string | null;
  changedAt: string;
}): string {
  const fecha = formatChangedAt(input.changedAt);

  return [
    "🟢 *DODA Liberado*",
    "",
    `Número: *${input.integrationNumber}*`,
    `📋 Pedimento: ${input.pedimento?.trim() || "N/A"}`,
    `🏛️ Tipo: ${input.tipoPedimento?.trim() || "N/A"}`,
    `📅 ${fecha}`,
    "",
    "_Chavarrias Servicios Aduanales_",
  ].join("\n");
}

function buildEmailHtml(
  input: DodaResolvedNotificationInput,
): string {
  const previous = input.previousStatus?.trim() || "Sin estatus previo";
  const changedAt = formatChangedAt(input.changedAt);
  const dodaUrl = `${getAppBaseUrl()}${dodaNotificationHref(input.dodaId)}`;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">
      <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a">
        DODA #${input.integrationNumber}
      </h2>
      <p style="margin:0 0 16px;color:#475569">
        El estatus del DODA fue actualizado en el monitoreo automático del SAT.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 0;color:#64748b">Número de integración</td>
          <td style="padding:8px 0;font-weight:600;text-align:right">${input.integrationNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">Estatus anterior</td>
          <td style="padding:8px 0;text-align:right">${previous}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">Estatus nuevo</td>
          <td style="padding:8px 0;font-weight:600;text-align:right;color:#059669">${input.newStatus}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">Fecha y hora</td>
          <td style="padding:8px 0;text-align:right">${changedAt}</td>
        </tr>
      </table>
      <a href="${dodaUrl}" style="display:inline-block;background:#227DE8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">
        Ver DODA en el CRM
      </a>
    </div>
  `.trim();
}

async function loadNotificationRecipients(
  supabase: SupabaseClient,
  input: DodaResolvedNotificationInput,
): Promise<{ emails: EmailRecipient[] }> {
  const emails: EmailRecipient[] = [];

  if (input.clienteId) {
    const { data: client, error } = await supabase
      .from("clients")
      .select("full_name, email, phone")
      .eq("id", input.clienteId)
      .maybeSingle();

    if (error) {
      console.error("[doda-notify] failed to load client", error);
    } else if (client?.email?.trim()) {
      emails.push({
        label: client.full_name ?? "Cliente",
        email: client.email.trim(),
      });
    }
  }

  if (input.createdBy) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", input.createdBy)
      .maybeSingle();

    if (profileError) {
      console.error("[doda-notify] failed to load scheduler profile", profileError);
    } else if (profile?.email?.trim()) {
      emails.push({
        label: profile.full_name ?? "Administrador",
        email: profile.email.trim(),
      });
    }
  }

  return { emails };
}

async function loadDodaForNotification(
  supabase: SupabaseClient,
  dodaId: string,
): Promise<DodaRecord | null> {
  const { data, error } = await supabase
    .from("dodas")
    .select(DODA_RECORD_SELECT)
    .eq("id", dodaId)
    .maybeSingle();

  if (error) {
    console.error("[doda-notify] failed to load doda", dodaId, error);
    return null;
  }

  return (data as DodaRecord | null) ?? null;
}

async function sendResolvedEmail(
  recipient: EmailRecipient,
  input: DodaResolvedNotificationInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const subject = `DODA #${input.integrationNumber} — Estatus actualizado: ${input.newStatus}`;

  const { error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: recipient.email,
    subject,
    html: buildEmailHtml(input),
  });

  if (error) {
    throw new Error(error.message);
  }
}

function buildDodaLiberatedEvolutionMessage(doda: DodaRecord | null, input: DodaResolvedNotificationInput): string {
  const integracion =
    doda?.numero_integracion?.trim() || input.integrationNumber || "N/A";
  const vehiculo = doda?.datos_vehiculo?.trim() || "N/A";
  const pedimento = doda?.pedimento?.trim() || "N/A";
  const satStatus = doda?.sat_status?.trim() || input.newStatus || "N/A";

  return [
    "✅ DODA liberado",
    `Integración: ${integracion}`,
    `Vehículo: ${vehiculo}`,
    `Pedimento: ${pedimento}`,
    `Estatus SAT: ${satStatus}`,
  ].join("\n");
}

function resolveEvolutionWhatsAppDestination(
  doda: DodaRecord,
): { to: string; label: string } | null {
  if (doda.notify_type === "group") {
    const raw = doda.notify_whatsapp_group_id?.trim() ?? "";
    if (!raw) {
      return null;
    }
    return { to: raw, label: `Grupo ${raw}` };
  }

  if (doda.notify_type === "individual") {
    const raw =
      doda.notify_whatsapp_number?.trim() ||
      doda.whatsapp_phone?.trim() ||
      "";
    if (!raw) {
      return null;
    }
    const normalized = normalizeWhatsAppIndividualRecipient(raw);
    if (!normalized) {
      return null;
    }
    return { to: normalized, label: raw };
  }

  return null;
}

/**
 * Sends email + WhatsApp (Evolution) when a monitored DODA is resolved.
 * WhatsApp only when `notify_type` + destination are set on the DODA row.
 * Channels are independent: email failure does not block WhatsApp and vice versa.
 */
export async function sendDodaResolvedExternalNotifications(
  supabase: SupabaseClient,
  input: DodaResolvedNotificationInput,
): Promise<DodaResolvedNotificationResult> {
  const errors: string[] = [];
  let emailAttempted = false;
  let emailOk = false;
  let whatsAppAttempted = false;
  let whatsAppOk = false;

  const doda = await loadDodaForNotification(supabase, input.dodaId);
  const { emails } = await loadNotificationRecipients(supabase, input);

  const uniqueEmails = Array.from(
    new Map(emails.map((item) => [item.email.toLowerCase(), item])).values(),
  );

  for (const recipient of uniqueEmails) {
    emailAttempted = true;
    try {
      await sendResolvedEmail(recipient, input);
      emailOk = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar correo";
      errors.push(`Email (${recipient.email}): ${message}`);
      console.error("[doda-notify] email failed", recipient.email, error);
    }
  }

  // Evita doble envío de WhatsApp si ya se marcó como enviado.
  const alreadySentWhatsApp = Boolean(doda?.notification_sent_at);
  const waDestination =
    doda && !alreadySentWhatsApp
      ? resolveEvolutionWhatsAppDestination(doda)
      : null;

  if (waDestination) {
    whatsAppAttempted = true;
    try {
      await sendEvolutionText(
        waDestination.to,
        buildDodaLiberatedEvolutionMessage(doda, input),
      );
      whatsAppOk = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar WhatsApp";
      errors.push(`WhatsApp (${waDestination.label}): ${message}`);
      console.error(
        "[doda-notify] evolution whatsapp failed",
        waDestination.label,
        error,
      );
    }
  }

  if (!emailAttempted && !whatsAppAttempted && !alreadySentWhatsApp) {
    return {
      notification_sent_at: null,
      notification_error:
        "No hay destinatarios con correo ni número WhatsApp en este DODA.",
    };
  }

  // notification_sent_at marca el WhatsApp (Evolution) exitoso para no reenviar.
  // Si solo hubo correo y salió bien, también se marca para no reintentar en bucle.
  let notificationSentAt: string | null = doda?.notification_sent_at ?? null;
  if (whatsAppOk) {
    notificationSentAt = new Date().toISOString();
  } else if (!whatsAppAttempted && emailAttempted && emailOk && !notificationSentAt) {
    notificationSentAt = new Date().toISOString();
  }

  return {
    notification_sent_at: notificationSentAt,
    notification_error: errors.length > 0 ? errors.join(" | ") : null,
  };
}
