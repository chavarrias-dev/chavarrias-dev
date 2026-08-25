import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Normalizes a phone string to digits only for comparison.
 */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Returns true when two phone values likely refer to the same line
 * (exact digit match or same last 10 digits for MX local numbers).
 */
export function phonesMatch(a: string, b: string): boolean {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  if (left.length >= 10 && right.length >= 10) {
    return left.slice(-10) === right.slice(-10);
  }
  return false;
}

/**
 * Finds a client whose stored phone matches the given number (see `phonesMatch`).
 */
export async function findClientIdByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, phone")
    .not("phone", "is", null);

  if (error || !clients) {
    return null;
  }

  const match = (
    clients as Array<{ id: string; phone: string | null }>
  ).find((client) => client.phone && phonesMatch(client.phone, phone));

  return match?.id ?? null;
}
