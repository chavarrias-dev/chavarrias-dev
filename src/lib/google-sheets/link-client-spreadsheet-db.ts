import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseSpreadsheetIdFromUrl,
  spreadsheetUrlFromId,
} from "@/lib/google-sheets/spreadsheet-url";

export function validateSpreadsheetLinkInput(raw: string): {
  ok: true;
  spreadsheetId: string;
} | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Pega la URL o el ID de la hoja de Google." };
  }

  const spreadsheetId = parseSpreadsheetIdFromUrl(trimmed);
  if (!spreadsheetId) {
    return {
      ok: false,
      error:
        "Enlace no válido. Usa una URL de Google Sheets o el ID de la hoja.",
    };
  }

  return { ok: true, spreadsheetId };
}

export async function linkClientSpreadsheetInDb(
  admin: SupabaseClient,
  clientId: string,
  spreadsheetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const spreadsheetUrl = spreadsheetUrlFromId(spreadsheetId);

  const { error } = await admin
    .from("clients")
    .update({
      google_spreadsheet_id: spreadsheetId,
      google_spreadsheet_url: spreadsheetUrl,
      google_spreadsheet_created_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function unlinkClientSpreadsheetInDb(
  admin: SupabaseClient,
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin
    .from("clients")
    .update({
      google_spreadsheet_id: null,
      google_spreadsheet_url: null,
      google_spreadsheet_created_at: null,
    })
    .eq("id", clientId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
