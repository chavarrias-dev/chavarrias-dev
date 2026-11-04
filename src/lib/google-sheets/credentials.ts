import "server-only";

type ServiceAccountJson = {
  client_email?: string;
  private_key?: string;
};

function serviceAccountFromJsonEnv(): ServiceAccountJson | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function googleServiceAccountEmail(): string | null {
  const fromJson = serviceAccountFromJsonEnv()?.client_email?.trim();
  if (fromJson) return fromJson;

  const email =
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  return email || null;
}

export function googleServiceAccountPrivateKey(): string | null {
  const fromJson = serviceAccountFromJsonEnv()?.private_key;
  if (fromJson) return fromJson;

  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim();
  return raw || null;
}
