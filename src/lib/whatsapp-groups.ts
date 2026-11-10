import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type WhatsappGroupRow = {
  id: string;
  name: string;
  group_id: string;
  created_at: string | null;
};

const GROUP_ROW_SELECT = "id, name, group_id, created_at";

/**
 * Canonical storage format for `whatsapp_groups.group_id` and
 * `dodas.notify_whatsapp_group_id`: digits only (no `@g.us` suffix).
 * Evolution receives `digits@g.us` at send time when needed.
 */
export function normalizeWhatsappGroupIdForStorage(raw: string): string {
  return raw.trim().replace(/@g\.us$/i, "").trim();
}

/** Digits-only + `digits@g.us` for matching catalog vs dodas rows during transition. */
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

export type PendingDodaForGroup = {
  id: string;
  numero_integracion: string | null;
};

/**
 * Finds a catalog row by normalized group_id (matches digits and digits@g.us).
 * Optionally excludes a row id (for PATCH uniqueness checks).
 */
export async function findWhatsappGroupByNormalizedId(
  supabase: SupabaseClient,
  rawGroupId: string,
  excludeRowId?: string,
): Promise<WhatsappGroupRow | null> {
  const variants = whatsappGroupIdStorageVariants(rawGroupId);
  if (variants.length === 0) {
    return null;
  }

  let query = supabase
    .from("whatsapp_groups")
    .select(GROUP_ROW_SELECT)
    .in("group_id", variants)
    .order("created_at", { ascending: true })
    .limit(5);

  const { data, error } = await query;

  if (error || !data?.length) {
    if (error) {
      console.error("[whatsapp-groups] find by normalized id failed", error);
    }
    return null;
  }

  const rows = data as WhatsappGroupRow[];
  const match = excludeRowId
    ? rows.find((row) => row.id !== excludeRowId)
    : rows[0];
  return match ?? null;
}

/**
 * DODAs that still use this group in active monitoring.
 * Cancelled rows keep is_resolved=false but is_monitored=false — those must not block delete.
 */
export async function listPendingDodasForGroupId(
  supabase: SupabaseClient,
  groupIdStored: string,
): Promise<PendingDodaForGroup[]> {
  const variants = whatsappGroupIdStorageVariants(groupIdStored);
  if (variants.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("dodas")
    .select("id, numero_integracion")
    .eq("is_monitored", true)
    .eq("is_resolved", false)
    .eq("notify_type", "group")
    .in("notify_whatsapp_group_id", variants)
    .order("numero_integracion", { ascending: true });

  if (error) {
    console.error("[whatsapp-groups] list pending dodas failed", error);
    return [];
  }

  return (data ?? []) as PendingDodaForGroup[];
}

export async function countPendingDodasForGroupId(
  supabase: SupabaseClient,
  groupIdStored: string,
): Promise<number> {
  return (await listPendingDodasForGroupId(supabase, groupIdStored)).length;
}

export function duplicateGroupMessage(existingName: string): string {
  return `Este grupo ya está registrado como «${existingName}»`;
}

/**
 * Reassigns pending monitored DODAs from `fromGroupIdStored` variants to the
 * canonical `toGroupIdStored`, then deletes the catalog row. Runs in one DB transaction.
 */
export async function reassignPendingDodasAndDeleteGroup(input: {
  deleteRowId: string;
  fromGroupIdStored: string;
  toGroupIdStored: string;
}): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const postgres = (await import("postgres")).default;
  const sql = postgres(connectionString, { max: 1, ssl: "require" });
  const fromVariants = whatsappGroupIdStorageVariants(input.fromGroupIdStored);
  const toCanon = normalizeWhatsappGroupIdForStorage(input.toGroupIdStored);

  if (fromVariants.length === 0 || !toCanon) {
    await sql.end({ timeout: 5 });
    throw new Error("IDs de grupo inválidos para reasignar");
  }

  try {
    await sql.begin(async (tx) => {
      await tx`
        UPDATE dodas
        SET notify_whatsapp_group_id = ${toCanon}
        WHERE is_monitored = true
          AND is_resolved = false
          AND notify_type = 'group'
          AND notify_whatsapp_group_id = ANY(${fromVariants})
      `;
      const deleted = await tx`
        DELETE FROM whatsapp_groups
        WHERE id = ${input.deleteRowId}::uuid
        RETURNING id
      `;
      if (deleted.length === 0) {
        throw new Error("Grupo no encontrado");
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
