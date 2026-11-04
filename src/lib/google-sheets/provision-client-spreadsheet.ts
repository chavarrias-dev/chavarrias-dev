import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  googleDriveClientsFolderId,
  googleSheetsClientTemplateId,
  googleWorkspaceDomainForEditors,
  isGoogleSheetsProvisioningConfigured,
} from "@/lib/google-sheets/config";
import { createGoogleDriveClient } from "@/lib/google-sheets/google-auth";
import { grantClientReaderAccess } from "@/lib/google-sheets/spreadsheet-permissions";
import { spreadsheetUrlFromId } from "@/lib/google-sheets/spreadsheet-url";

export type ProvisionClientSpreadsheetResult =
  | { ok: true; spreadsheetId: string; spreadsheetUrl: string; created: boolean }
  | { ok: false; error: string; code: "not_configured" | "missing_client" | "api" };

type ClientRow = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  google_spreadsheet_id: string | null;
  google_spreadsheet_url: string | null;
};

function workbookTitle(client: Pick<ClientRow, "full_name" | "company_name">): string {
  const clientName =
    client.company_name?.trim() || client.full_name.trim() || "Cliente";
  return `Estados de cuenta Chavarrias SA - ${clientName}`;
}

async function loadStaffEditorEmails(
  admin: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("email, role")
    .in("role", ["admin", "empleado"]);

  if (error) {
    throw new Error(error.message);
  }

  const emails = new Set<string>();
  for (const row of data ?? []) {
    const email = (row as { email?: string }).email?.trim().toLowerCase();
    if (email) {
      emails.add(email);
    }
  }
  return [...emails];
}

async function ensureSpreadsheetTeamAccess(
  admin: SupabaseClient,
  drive: ReturnType<typeof createGoogleDriveClient>,
  spreadsheetId: string,
  clientEmail: string,
): Promise<void> {
  if (!drive) return;
  const staffEmails = await loadStaffEditorEmails(admin);
  await grantSpreadsheetAccess(drive, spreadsheetId, staffEmails);
  await grantClientReaderAccess(drive, spreadsheetId, clientEmail);
}

async function grantSpreadsheetAccess(
  drive: ReturnType<typeof createGoogleDriveClient>,
  spreadsheetId: string,
  staffEmails: string[],
): Promise<void> {
  if (!drive) return;

  const domain = googleWorkspaceDomainForEditors();
  if (domain) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: "domain",
        role: "writer",
        domain,
      },
      sendNotificationEmail: false,
    });
    return;
  }

  for (const email of staffEmails) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: email,
        },
        sendNotificationEmail: false,
      });
    } catch {
      // Skip invalid or outside-domain addresses.
    }
  }
}

export async function provisionClientSpreadsheet(
  admin: SupabaseClient,
  clientId: string,
): Promise<ProvisionClientSpreadsheetResult> {
  if (!isGoogleSheetsProvisioningConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      error:
        "Google Sheets no está configurado (cuenta de servicio y plantilla en variables de entorno).",
    };
  }

  const templateId = googleSheetsClientTemplateId();
  if (!templateId) {
    return {
      ok: false,
      code: "not_configured",
      error: "Falta GOOGLE_SHEETS_CLIENT_TEMPLATE_ID.",
    };
  }

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .select(
      "id, full_name, company_name, email, google_spreadsheet_id, google_spreadsheet_url",
    )
    .eq("id", clientId)
    .maybeSingle<ClientRow>();

  if (clientErr || !client) {
    return {
      ok: false,
      code: "missing_client",
      error: clientErr?.message ?? "Cliente no encontrado.",
    };
  }

  if (client.google_spreadsheet_id && client.google_spreadsheet_url) {
    const driveExisting = createGoogleDriveClient();
    if (driveExisting) {
      await ensureSpreadsheetTeamAccess(
        admin,
        driveExisting,
        client.google_spreadsheet_id,
        client.email,
      );
    }
    return {
      ok: true,
      spreadsheetId: client.google_spreadsheet_id,
      spreadsheetUrl: client.google_spreadsheet_url,
      created: false,
    };
  }

  const drive = createGoogleDriveClient();
  if (!drive) {
    return {
      ok: false,
      code: "not_configured",
      error: "No se pudo autenticar con Google.",
    };
  }

  const folderId = googleDriveClientsFolderId();
  const copy = await drive.files.copy({
    fileId: templateId,
    supportsAllDrives: true,
    requestBody: {
      name: workbookTitle(client),
      ...(folderId ? { parents: [folderId] } : {}),
    },
  });

  const spreadsheetId = copy.data.id;
  if (!spreadsheetId) {
    return {
      ok: false,
      code: "api",
      error: "Google no devolvió el ID de la hoja copiada.",
    };
  }

  await ensureSpreadsheetTeamAccess(
    admin,
    drive,
    spreadsheetId,
    client.email,
  );

  const spreadsheetUrl = spreadsheetUrlFromId(spreadsheetId);
  const createdAt = new Date().toISOString();

  const { error: updateErr } = await admin
    .from("clients")
    .update({
      google_spreadsheet_id: spreadsheetId,
      google_spreadsheet_url: spreadsheetUrl,
      google_spreadsheet_created_at: createdAt,
    })
    .eq("id", clientId);

  if (updateErr) {
    return { ok: false, code: "api", error: updateErr.message };
  }

  return {
    ok: true,
    spreadsheetId,
    spreadsheetUrl,
    created: true,
  };
}

export async function provisionClientSpreadsheetIfConfigured(
  admin: SupabaseClient,
  clientId: string,
): Promise<void> {
  if (!isGoogleSheetsProvisioningConfigured()) {
    return;
  }
  try {
    await provisionClientSpreadsheet(admin, clientId);
  } catch (error) {
    console.error("[google-sheets] provision failed", clientId, error);
  }
}

export async function linkExistingClientSpreadsheet(
  admin: SupabaseClient,
  clientId: string,
  spreadsheetId: string,
): Promise<ProvisionClientSpreadsheetResult> {
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .select("id, email, google_spreadsheet_id, google_spreadsheet_url")
    .eq("id", clientId)
    .maybeSingle<{
      id: string;
      email: string;
      google_spreadsheet_id: string | null;
      google_spreadsheet_url: string | null;
    }>();

  if (clientErr || !client) {
    return {
      ok: false,
      code: "missing_client",
      error: clientErr?.message ?? "Cliente no encontrado.",
    };
  }

  if (
    client.google_spreadsheet_id &&
    client.google_spreadsheet_id !== spreadsheetId
  ) {
    return {
      ok: false,
      code: "api",
      error:
        "Este cliente ya tiene su archivo de estado de cuenta. Sigue editando el enlace actual en Google Sheets; no se sustituye desde el CRM.",
    };
  }

  if (
    client.google_spreadsheet_id === spreadsheetId &&
    client.google_spreadsheet_url
  ) {
    const drive = createGoogleDriveClient();
    if (drive) {
      await ensureSpreadsheetTeamAccess(
        admin,
        drive,
        spreadsheetId,
        client.email,
      );
    }
    return {
      ok: true,
      spreadsheetId,
      spreadsheetUrl: client.google_spreadsheet_url,
      created: false,
    };
  }

  const drive = createGoogleDriveClient();
  if (drive) {
    await ensureSpreadsheetTeamAccess(
      admin,
      drive,
      spreadsheetId,
      client.email,
    );
  }

  const spreadsheetUrl = spreadsheetUrlFromId(spreadsheetId);
  const { error: updateErr } = await admin
    .from("clients")
    .update({
      google_spreadsheet_id: spreadsheetId,
      google_spreadsheet_url: spreadsheetUrl,
      google_spreadsheet_created_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (updateErr) {
    return { ok: false, code: "api", error: updateErr.message };
  }

  return {
    ok: true,
    spreadsheetId,
    spreadsheetUrl,
    created: false,
  };
}
