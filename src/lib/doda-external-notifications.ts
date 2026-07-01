import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { dodaNotificationHref } from "@/lib/doda-types";
import { normalizePhoneDigits } from "@/lib/phone-match";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp";

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

type WhatsAppRecipient = {
  label: string;
  phone: string;
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
  return new Date(value).toLocaleString("es-MX", {
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

function whatsAppRecipientId(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  return digits.length >= 10 ? digits : null;
}

function buildEmailHtml(input: DodaResolvedNotificationInput): string {
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

function buildWhatsAppMessage(input: DodaResolvedNotificationInput): string {
  const previous = input.previousStatus?.trim() || "Sin estatus previo";
  const changedAt = formatChangedAt(input.changedAt);

  return [
    `DODA #${input.integrationNumber}`,
    `Estatus actualizado: ${previous} → ${input.newStatus}`,
    `Fecha: ${changedAt}`,
    "Consulta el CRM para ver el detalle completo.",
  ].join("\n");
}

async function loadNotificationRecipients(
  supabase: SupabaseClient,
  input: DodaResolvedNotificationInput,
): Promise<{ emails: EmailRecipient[]; phones: WhatsAppRecipient[] }> {
  const emails: EmailRecipient[] = [];
  const phones: WhatsAppRecipient[] = [];

  if (input.clienteId) {
    const { data: client, error } = await supabase
      .from("clients")
      .select("full_name, email, phone")
      .eq("id", input.clienteId)
      .maybeSingle();

    if (error) {
      console.error("[doda-notify] failed to load client", error);
    } else if (client) {
      if (client.email?.trim()) {
        emails.push({
          label: client.full_name ?? "Cliente",
          email: client.email.trim(),
        });
      }
      if (client.phone?.trim()) {
        phones.push({
          label: client.full_name ?? "Cliente",
          phone: client.phone.trim(),
        });
      }
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

    const { data: authWrap, error: authError } =
      await supabase.auth.admin.getUserById(input.createdBy);

    if (authError) {
      console.error("[doda-notify] failed to load scheduler auth user", authError);
    } else {
      const metaPhone = authWrap?.user?.user_metadata?.phone;
      if (typeof metaPhone === "string" && metaPhone.trim()) {
        phones.push({
          label: profile?.full_name ?? "Administrador",
          phone: metaPhone.trim(),
        });
      }
    }
  }

  return { emails, phones };
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

async function sendResolvedWhatsApp(
  recipient: WhatsAppRecipient,
  input: DodaResolvedNotificationInput,
): Promise<void> {
  const to = whatsAppRecipientId(recipient.phone);
  if (!to) {
    throw new Error(`Teléfono inválido para ${recipient.label}`);
  }

  await sendWhatsAppTextMessage(to, buildWhatsAppMessage(input));
}

/**
 * Sends email + WhatsApp when a monitored DODA is resolved.
 * Each channel is isolated in try/catch; failures are aggregated, never thrown.
 */
export async function sendDodaResolvedExternalNotifications(
  supabase: SupabaseClient,
  input: DodaResolvedNotificationInput,
): Promise<DodaResolvedNotificationResult> {
  const errors: string[] = [];
  let successCount = 0;
  let attemptCount = 0;

  const { emails, phones } = await loadNotificationRecipients(supabase, input);

  const uniqueEmails = Array.from(
    new Map(emails.map((item) => [item.email.toLowerCase(), item])).values(),
  );
  const uniquePhones = Array.from(
    new Map(
      phones
        .map((item) => [whatsAppRecipientId(item.phone), item] as const)
        .filter(([digits]) => Boolean(digits)),
    ).values(),
  );

  for (const recipient of uniqueEmails) {
    attemptCount += 1;
    try {
      await sendResolvedEmail(recipient, input);
      successCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar correo";
      errors.push(`Email (${recipient.email}): ${message}`);
      console.error("[doda-notify] email failed", recipient.email, error);
    }
  }

  for (const recipient of uniquePhones) {
    attemptCount += 1;
    try {
      await sendResolvedWhatsApp(recipient, input);
      successCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar WhatsApp";
      errors.push(`WhatsApp (${recipient.phone}): ${message}`);
      console.error("[doda-notify] whatsapp failed", recipient.phone, error);
    }
  }

  if (attemptCount === 0) {
    return {
      notification_sent_at: null,
      notification_error:
        "No hay destinatarios con correo o teléfono configurado.",
    };
  }

  const allSucceeded = successCount === attemptCount;

  return {
    notification_sent_at: allSucceeded ? new Date().toISOString() : null,
    notification_error: errors.length > 0 ? errors.join(" | ") : null,
  };
}
