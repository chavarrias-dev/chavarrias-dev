const SPREADSHEET_ID_PATTERN =
  /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

export function spreadsheetUrlFromId(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export function parseSpreadsheetIdFromUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(SPREADSHEET_ID_PATTERN);
  return match?.[1] ?? null;
}

export function normalizeSpreadsheetUrl(raw: string): string | null {
  const id = parseSpreadsheetIdFromUrl(raw);
  if (!id) return null;
  return spreadsheetUrlFromId(id);
}
