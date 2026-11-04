const SPREADSHEET_ID_PATTERN =
  /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

export function spreadsheetUrlFromId(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/** Read-only open URL (client portal). Does not grant edit in Google; user still needs Viewer on the file. */
export function spreadsheetViewUrlFromId(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/view`;
}

export function spreadsheetViewUrlFromStoredUrl(
  url: string | null,
): string | null {
  const id = spreadsheetIdFromStoredUrl(url);
  if (!id) {
    return null;
  }
  return spreadsheetViewUrlFromId(id);
}

export function spreadsheetOpenUrlForPortalUser(
  storedUrl: string | null,
  isStaff: boolean,
): string | null {
  if (!storedUrl) {
    return null;
  }
  if (isStaff) {
    return storedUrl;
  }
  return spreadsheetViewUrlFromStoredUrl(storedUrl) ?? storedUrl;
}

/** Embed-friendly preview (Google may still require login or block if not shared). */
export function spreadsheetPreviewEmbedUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/preview?rm=minimal&widget=true&headers=false`;
}

export function spreadsheetIdFromStoredUrl(url: string | null): string | null {
  if (!url) return null;
  return parseSpreadsheetIdFromUrl(url);
}

const SPREADSHEET_ID_ONLY = /^[a-zA-Z0-9-_]{20,}$/;

export function parseSpreadsheetIdFromUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (SPREADSHEET_ID_ONLY.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(SPREADSHEET_ID_PATTERN);
  const id = match?.[1];
  if (!id || !SPREADSHEET_ID_ONLY.test(id)) {
    return null;
  }
  return id;
}

export function normalizeSpreadsheetUrl(raw: string): string | null {
  const id = parseSpreadsheetIdFromUrl(raw);
  if (!id) return null;
  return spreadsheetUrlFromId(id);
}
