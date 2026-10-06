import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhoneDigits } from "@/lib/phone-match";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type DodaNotificationConfigType = "individual" | "group";

export type DodaNotificationConfigRecord = {
  id: string;
  type: DodaNotificationConfigType;
  whatsapp_number: string | null;
  whatsapp_group_id: string | null;
  created_by: string | null;
  created_at: string;
};

const CONFIG_SELECT =
  "id, type, whatsapp_number, whatsapp_group_id, created_by, created_at";

export async function getLatestDodaNotificationConfig(
  supabase: SupabaseClient,
): Promise<DodaNotificationConfigRecord | null> {
  const { data, error } = await supabase
    .from("doda_notification_config")
    .select(CONFIG_SELECT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[doda-notification-config] load failed", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as DodaNotificationConfigRecord;
  if (row.type !== "individual" && row.type !== "group") {
    return null;
  }

  return row;
}

export function formatDodaNotificationDestination(
  config: DodaNotificationConfigRecord | null,
  adminFallbackLabel = "números de administrador",
): string {
  if (!config) {
    return adminFallbackLabel;
  }

  if (config.type === "individual" && config.whatsapp_number?.trim()) {
    return formatPhoneDisplay(config.whatsapp_number.trim());
  }

  if (config.type === "group" && config.whatsapp_group_id?.trim()) {
    return `Grupo ${config.whatsapp_group_id.trim()}`;
  }

  return adminFallbackLabel;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 12 && digits.startsWith("52")) {
    const local = digits.slice(2);
    if (local.length === 10) {
      return `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
  }
  if (digits.length === 10) {
    return `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone.trim();
}

export type DodaBatchNotifyFields = {
  notify_type: "individual" | "group" | null;
  notify_whatsapp_number: string | null;
  notify_whatsapp_group_id: string | null;
};

const EMPTY_BATCH_NOTIFY: DodaBatchNotifyFields = {
  notify_type: null,
  notify_whatsapp_number: null,
  notify_whatsapp_group_id: null,
};

/** Parses optional batch notification from schedule form / API. */
export function parseDodaBatchNotifySettings(input: {
  notify_type?: string | null;
  notify_whatsapp_number?: string | null;
  notify_whatsapp_group_id?: string | null;
}): DodaBatchNotifyFields {
  const type = input.notify_type?.trim();
  if (type !== "individual" && type !== "group") {
    return EMPTY_BATCH_NOTIFY;
  }

  if (type === "individual") {
    const raw = input.notify_whatsapp_number?.trim() ?? "";
    if (!raw || !normalizeWhatsAppIndividualRecipient(raw)) {
      return EMPTY_BATCH_NOTIFY;
    }
    return {
      notify_type: "individual",
      notify_whatsapp_number: formatPhoneDisplay(raw),
      notify_whatsapp_group_id: null,
    };
  }

  const groupRaw = input.notify_whatsapp_group_id?.trim() ?? "";
  if (!groupRaw || !normalizeWhatsAppGroupRecipient(groupRaw)) {
    return EMPTY_BATCH_NOTIFY;
  }

  return {
    notify_type: "group",
    notify_whatsapp_number: null,
    notify_whatsapp_group_id: groupRaw.replace(/@g\.us$/i, "").trim(),
  };
}

export function normalizeWhatsAppIndividualRecipient(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10) {
    return null;
  }
  if (digits.length === 10) {
    return `52${digits}`;
  }
  return digits;
}

export function normalizeWhatsAppGroupRecipient(groupId: string): string | null {
  const trimmed = groupId.trim();
  if (!trimmed) {
    return null;
  }
  const withoutSuffix = trimmed.replace(/@g\.us$/i, "");
  const digits = normalizePhoneDigits(withoutSuffix);
  return digits.length >= 8 ? digits : withoutSuffix.replace(/\s/g, "");
}

export type WhatsAppDestination = {
  label: string;
  to: string;
  kind: DodaNotificationConfigType | "admin_fallback";
};

export async function resolveDodaWhatsAppDestinations(
  supabase: SupabaseClient,
  config: DodaNotificationConfigRecord | null,
): Promise<WhatsAppDestination[]> {
  if (config?.type === "individual" && config.whatsapp_number?.trim()) {
    const to = normalizeWhatsAppIndividualRecipient(config.whatsapp_number);
    if (to) {
      return [
        {
          label: "Chat individual",
          to,
          kind: "individual",
        },
      ];
    }
  }

  if (config?.type === "group" && config.whatsapp_group_id?.trim()) {
    const to = normalizeWhatsAppGroupRecipient(config.whatsapp_group_id);
    if (to) {
      return [
        {
          label: "Grupo WhatsApp",
          to,
          kind: "group",
        },
      ];
    }
  }

  return loadAdminWhatsAppDestinations(supabase);
}

async function loadAdminWhatsAppDestinations(
  supabase: SupabaseClient,
): Promise<WhatsAppDestination[]> {
  const adminClient = createSupabaseAdminClient();
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin");

  if (error || !admins?.length) {
    console.error("[doda-notification-config] failed to load admins", error);
    return [];
  }

  const destinations: WhatsAppDestination[] = [];
  const seen = new Set<string>();

  for (const admin of admins as Array<{ id: string; full_name: string | null }>) {
    const { data: authWrap, error: authError } =
      await adminClient.auth.admin.getUserById(admin.id);

    if (authError) {
      console.error(
        "[doda-notification-config] admin auth lookup failed",
        admin.id,
        authError,
      );
      continue;
    }

    const metaPhone = authWrap?.user?.user_metadata?.phone;
    if (typeof metaPhone !== "string" || !metaPhone.trim()) {
      continue;
    }

    const to = normalizeWhatsAppIndividualRecipient(metaPhone);
    if (!to || seen.has(to)) {
      continue;
    }

    seen.add(to);
    destinations.push({
      label: admin.full_name ?? "Administrador",
      to,
      kind: "admin_fallback",
    });
  }

  return destinations;
}
