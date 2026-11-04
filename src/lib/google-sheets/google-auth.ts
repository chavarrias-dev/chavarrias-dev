import "server-only";

import { google } from "googleapis";
import {
  googleServiceAccountEmail,
  googleServiceAccountPrivateKey,
} from "@/lib/google-sheets/credentials";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];

function createJwtAuth() {
  const email = googleServiceAccountEmail();
  const privateKeyRaw = googleServiceAccountPrivateKey();
  if (!email || !privateKeyRaw) {
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: GOOGLE_SCOPES,
  });
}

export function createGoogleDriveClient() {
  const auth = createJwtAuth();
  if (!auth) return null;
  return google.drive({ version: "v3", auth });
}

export function createGoogleSheetsClient() {
  const auth = createJwtAuth();
  if (!auth) return null;
  return google.sheets({ version: "v4", auth });
}
