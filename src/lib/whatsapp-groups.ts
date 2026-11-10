import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type WhatsappGroupRow = {
  id: string;
  name: string;
  group_id: string;
  created_at: string | null;
};

const GROUP_ROW_SELECT = "id, name, group_id, created_at";

/** Raw ID: digits optional @g.us (Evolution / WhatsApp group JID without chat. prefix). */
export function normalizeWhatsappGroupIdForStorage(raw: string): string {
  return raw.trim().replace(/@g\.us$/i, "").trim();
}

/** Digits-only + `digits@g.us` for matching catalog vs dodas rows. */
export function whatsappGroupIdStorageVariants(raw: string): string[] {
  const digits = normalizeWhatsappGroupIdForStorage(raw);
  if (!digits) {
    return [];
  }
  return Array.from(new Set([digits, `${digits}@g.us`]));
}

export function isValidWhatsappGroupIdFormat(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  return /^[0-9]{8,}(@g\.us)?$/i.test(trimmed.replace(/\s/g, ""));
}

export async function listWhatsappGroups(
  supabase: SupabaseClient,
): Promise<{ rows: WhatsappGroupRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select(GROUP_ROW_SELECT)
    .order("name", { ascending: true });

  if (error) {
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as WhatsappGroupRow[], error: null };
}

export async function getWhatsappGroupById(
  supabase: SupabaseClient,
  id: string,
): Promise<WhatsappGroupRow | null> {
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select(GROUP_ROW_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[whatsapp-groups] getWhatsappGroupById failed", id, error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data as WhatsappGroupRow;
}

/**
 * Resolves a registered group UUID (from dropdown) to the stored `group_id` string.
 * Returns null if not found.
 */
export async function resolveRegisteredGroupIdString(
  supabase: SupabaseClient,
  registeredRowId: string,
): Promise<string | null> {
  const row = await getWhatsappGroupById(supabase, registeredRowId);
  return row?.group_id?.trim() ? row.group_id : null;
}

/**
 * Verifies that `storedGroupId` (digits, as in `dodas.notify_whatsapp_group_id`) exists in catalog.
 */
export async function isWhatsappGroupIdRegistered(
  supabase: SupabaseClient,
  storedGroupId: string,
): Promise<boolean> {
  const variants = whatsappGroupIdStorageVariants(storedGroupId);
  if (variants.length === 0) {
    return false;
  }
  const { data, error } = await supabase
    .from("whatsapp_groups")
    .select("id")
    .in("group_id", variants)
    .limit(1);

  if (error || !data?.length) {
    return false;
  }
  return true;
}

/**
 * DODAs that still use this group in active monitoring.
 * Cancelled rows keep is_resolved=false but is_monitored=false — those must not block delete.
 */
export async function countPendingDodasForGroupId(
  supabase: SupabaseClient,
  groupIdStored: string,
): Promise<number> {
  const variants = whatsappGroupIdStorageVariants(groupIdStored);
  if (variants.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("dodas")
    .select("id", { count: "exact", head: true })
    .eq("is_monitored", true)
    .eq("is_resolved", false)
    .eq("notify_type", "group")
    .in("notify_whatsapp_group_id", variants);

  if (error) {
    console.error("[whatsapp-groups] count pending dodas failed", error);
    return 0;
  }
  return count ?? 0;
}
