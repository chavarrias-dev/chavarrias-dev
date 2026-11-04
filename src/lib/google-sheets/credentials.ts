import "server-only";

export function googleServiceAccountEmail(): string | null {
  const email =
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  return email || null;
}

export function googleServiceAccountPrivateKey(): string | null {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim();
  return raw || null;
}
