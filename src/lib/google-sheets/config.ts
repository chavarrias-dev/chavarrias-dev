import "server-only";

import {
  googleServiceAccountEmail,
  googleServiceAccountPrivateKey,
} from "@/lib/google-sheets/credentials";

export function isGoogleSheetsProvisioningConfigured(): boolean {
  return (
    Boolean(googleServiceAccountEmail()) &&
    Boolean(googleServiceAccountPrivateKey()) &&
    Boolean(process.env.GOOGLE_SHEETS_CLIENT_TEMPLATE_ID?.trim())
  );
}

export function googleSheetsClientTemplateId(): string | null {
  const id =
    process.env.GOOGLE_SHEETS_CLIENT_TEMPLATE_ID?.trim() ||
    process.env.GOOGLE_SHEETS_TEMPLATE_ID?.trim();
  return id || null;
}

export function googleDriveClientsFolderId(): string | null {
  const id =
    process.env.GOOGLE_DRIVE_CLIENTS_FOLDER_ID?.trim() ||
    process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  return id || null;
}

/** If set, all users @domain get writer access (Workspace). */
export function googleWorkspaceDomainForEditors(): string | null {
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim();
  return domain || null;
}
