import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientSpreadsheetFields = {
  google_spreadsheet_id: string | null;
  google_spreadsheet_url: string | null;
  google_spreadsheet_created_at: string | null;
};

export const EMPTY_CLIENT_SPREADSHEET_FIELDS: ClientSpreadsheetFields = {
  google_spreadsheet_id: null,
  google_spreadsheet_url: null,
  google_spreadsheet_created_at: null,
};

export function isMissingGoogleSpreadsheetColumnError(
  message: string | undefined,
): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("google_spreadsheet") &&
    (lower.includes("does not exist") ||
      lower.includes("could not find") ||
      lower.includes("schema cache"))
  );
}

export async function fetchClientByIdWithSpreadsheetFallback<
  T extends Record<string, unknown>,
>(
  supabase: SupabaseClient,
  clientId: string,
  columnsWithSpreadsheet: string,
  columnsWithoutSpreadsheet: string,
): Promise<{ data: (T & ClientSpreadsheetFields) | null; error: string | null }> {
  const withSheet = await supabase
    .from("clients")
    .select(columnsWithSpreadsheet)
    .eq("id", clientId)
    .maybeSingle<T>();

  if (!withSheet.error) {
    return {
      data: withSheet.data as (T & ClientSpreadsheetFields) | null,
      error: null,
    };
  }

  if (!isMissingGoogleSpreadsheetColumnError(withSheet.error.message)) {
    return { data: null, error: withSheet.error.message };
  }

  const withoutSheet = await supabase
    .from("clients")
    .select(columnsWithoutSpreadsheet)
    .eq("id", clientId)
    .maybeSingle<T>();

  if (withoutSheet.error) {
    return { data: null, error: withoutSheet.error.message };
  }

  if (!withoutSheet.data) {
    return { data: null, error: null };
  }

  return {
    data: {
      ...withoutSheet.data,
      ...EMPTY_CLIENT_SPREADSHEET_FIELDS,
    },
    error: null,
  };
}
