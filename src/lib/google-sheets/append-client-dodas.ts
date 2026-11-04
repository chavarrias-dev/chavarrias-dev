import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DODA_DISPLAY_TIMEZONE,
  formatDodaDateTime,
  getDodaConfirmationDate,
  normalizeDodaTimestamp,
} from "@/components/dodas/doda-display-utils";
import {
  isDodaConfirmed,
  UNASSIGNED_CLIENT_LABEL,
  type DodaDashboardRow,
} from "@/lib/doda-dashboard-categories";
import { attachClientNamesFromIds } from "@/lib/google-sheets/doda-rows-for-client";
import { createGoogleSheetsClient } from "@/lib/google-sheets/google-auth";
import {
  escapeSheetTabForRange,
  getEstadoDeCuentaMonthTabTitle,
  getMonthKeyInDodaTimezone,
} from "@/lib/google-sheets/estado-de-cuenta-month";
import { isGoogleSheetsProvisioningConfigured } from "@/lib/google-sheets/config";

const ESTADO_CUENTA_HEADERS = [
  "Número",
  "Estado",
  "Pedimento",
  "Tipo Pedimento",
  "Remesas",
  "Clave",
  "Vehículo",
  "Cantidad",
  "Remesa Consolidado",
  "Cliente",
  "Fecha confirmación",
] as const;

export type AppendClientDodasResult =
  | {
      ok: true;
      tabTitle: string;
      appended: number;
      skipped: number;
      spreadsheetUrl: string;
    }
  | { ok: false; error: string; code: "not_configured" | "no_sheet" | "api" };

function dodaMonthKey(doda: DodaDashboardRow): string | null {
  const confirmedAt = getDodaConfirmationDate(doda);
  if (!confirmedAt) return null;
  const date = new Date(normalizeDodaTimestamp(confirmedAt));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DODA_DISPLAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function dodaToRow(doda: DodaDashboardRow): string[] {
  return [
    doda.numero_integracion ?? "",
    doda.sat_status ?? "Desaduanamiento libre",
    doda.pedimento ?? "",
    doda.tipo_pedimento ?? "",
    doda.remesas_presentadas ?? "",
    doda.clave_pedimento ?? "",
    doda.datos_vehiculo ?? "",
    doda.cantidad_mercancia ?? "",
    "",
    doda.client_name ?? UNASSIGNED_CLIENT_LABEL,
    formatDodaDateTime(getDodaConfirmationDate(doda)),
  ];
}

export async function appendClientDodasToEstadoDeCuenta(
  admin: SupabaseClient,
  clientId: string,
): Promise<AppendClientDodasResult> {
  if (!isGoogleSheetsProvisioningConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      error: "Google Sheets no está configurado en el servidor.",
    };
  }

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .select("google_spreadsheet_id, google_spreadsheet_url")
    .eq("id", clientId)
    .maybeSingle<{
      google_spreadsheet_id: string | null;
      google_spreadsheet_url: string | null;
    }>();

  if (clientErr || !client?.google_spreadsheet_id || !client.google_spreadsheet_url) {
    return {
      ok: false,
      code: "no_sheet",
      error:
        "Este cliente no tiene hoja de estado de cuenta. Créala o vincúlala en su perfil.",
    };
  }

  const spreadsheetId = client.google_spreadsheet_id;
  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return {
      ok: false,
      code: "not_configured",
      error: "No se pudo autenticar con Google.",
    };
  }

  const monthKey = getMonthKeyInDodaTimezone();
  const tabTitle = getEstadoDeCuentaMonthTabTitle();
  const dodas = await attachClientNamesFromIds(admin, clientId);
  const candidates = dodas.filter(
    (doda) => isDodaConfirmed(doda) && dodaMonthKey(doda) === monthKey,
  );

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetList = meta.data.sheets ?? [];
  const hasTab = sheetList.some((s) => s.properties?.title === tabTitle);

  if (!hasTab) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabTitle },
            },
          },
        ],
      },
    });

    const tabRange = `${escapeSheetTabForRange(tabTitle)}!A1:K1`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: tabRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [Array.from(ESTADO_CUENTA_HEADERS)],
      },
    });
  }

  const tabRange = `${escapeSheetTabForRange(tabTitle)}!A:A`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabRange,
  });
  const existingNumbers = new Set(
    (existing.data.values ?? [])
      .slice(1)
      .map((row) => row[0]?.trim())
      .filter(Boolean),
  );

  const toAppend = candidates.filter((doda) => {
    const num = doda.numero_integracion?.trim();
    if (!num) return true;
    return !existingNumbers.has(num);
  });

  if (toAppend.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${escapeSheetTabForRange(tabTitle)}!A:K`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: toAppend.map(dodaToRow),
      },
    });
  }

  return {
    ok: true,
    tabTitle,
    appended: toAppend.length,
    skipped: candidates.length - toAppend.length,
    spreadsheetUrl: client.google_spreadsheet_url,
  };
}
