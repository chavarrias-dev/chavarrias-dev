import "server-only";

import type { drive_v3 } from "googleapis";

export async function grantClientReaderAccess(
  drive: drive_v3.Drive,
  spreadsheetId: string,
  clientEmail: string | null | undefined,
): Promise<void> {
  const email = clientEmail?.trim().toLowerCase();
  if (!email) return;

  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: "user",
        role: "reader",
        emailAddress: email,
      },
      sendNotificationEmail: false,
    });
  } catch {
    // Non-Workspace emails or policy blocks are ignored.
  }
}
