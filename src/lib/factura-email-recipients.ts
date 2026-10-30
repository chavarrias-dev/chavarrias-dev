const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const FACTURA_MAX_EXTRA_EMAILS = 10;

export function parseFacturaExtraEmails(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split(/[\n,;]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const email = part.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

export function validateFacturaExtraEmails(
  extras: string[],
): { ok: true } | { ok: false; error: string } {
  if (extras.length > FACTURA_MAX_EXTRA_EMAILS) {
    return {
      ok: false,
      error: `Máximo ${FACTURA_MAX_EXTRA_EMAILS} correos adicionales`,
    };
  }
  for (const email of extras) {
    if (!EMAIL_PATTERN.test(email)) {
      return {
        ok: false,
        error: `Correo adicional no válido: ${email}`,
      };
    }
  }
  return { ok: true };
}

export function buildFacturaEmailRecipients(
  clientEmail: string,
  extras: string[],
): string[] {
  const seen = new Set<string>();
  const recipients: string[] = [];

  const push = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    recipients.push(trimmed);
  };

  push(clientEmail);
  for (const extra of extras) {
    push(extra);
  }

  return recipients;
}

export function formatFacturaRecipientsForDisplay(recipients: string[]): string {
  return recipients.join(", ");
}

export function serializeFacturaExtraEmails(extras: string[]): string | null {
  if (extras.length === 0) return null;
  return extras.join("\n");
}
