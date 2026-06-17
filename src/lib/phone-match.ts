/**
 * Normalizes a phone string to digits only for comparison.
 */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Returns true when two phone values likely refer to the same line
 * (exact digit match or same last 10 digits for MX local numbers).
 */
export function phonesMatch(a: string, b: string): boolean {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  if (left.length >= 10 && right.length >= 10) {
    return left.slice(-10) === right.slice(-10);
  }
  return false;
}
