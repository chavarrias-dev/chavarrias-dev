import "server-only";

export const EVOLUTION_ENV_VARS_MISSING_HINT =
  "Define EVOLUTION_API_URL (base sin barra final), EVOLUTION_INSTANCE y EVOLUTION_API_KEY.";

/**
 * Normaliza el destino para Evolution: solo dígitos, últimos 10, prefijo 52.
 * Quita prefijos tipo whatsapp:, +, espacios, etc.
 */
export function normalizeEvolutionWhatsAppNumber(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    throw new Error(
      "El número debe tener al menos 10 dígitos (sin código de país en el campo local).",
    );
  }
  const last10 = digitsOnly.slice(-10);
  return `52${last10}`;
}

function getEvolutionConfig(): {
  baseUrl: string;
  instance: string;
  apiKey: string;
} {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "");
  const instance = process.env.EVOLUTION_INSTANCE?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!baseUrl || !instance || !apiKey) {
    throw new Error(`Evolution API no está configurada. ${EVOLUTION_ENV_VARS_MISSING_HINT}`);
  }

  return { baseUrl, instance, apiKey };
}

function formatEvolutionError(status: number, body: unknown): string {
  if (body === null || body === undefined) {
    return `Evolution API respondió ${status} sin cuerpo.`;
  }
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed || `Evolution API respondió ${status}.`;
  }
  if (typeof body === "object" && body !== null) {
    const o = body as Record<string, unknown>;
    const msg =
      (typeof o.message === "string" && o.message) ||
      (typeof o.error === "string" && o.error) ||
      (typeof o.statusText === "string" && o.statusText);
    if (msg) {
      return status >= 400 ? `Evolution API (${status}): ${msg}` : msg;
    }
    try {
      return `Evolution API (${status}): ${JSON.stringify(body)}`;
    } catch {
      return `Evolution API (${status}).`;
    }
  }
  return `Evolution API respondió ${status}.`;
}

export type SendEvolutionTextResult = {
  ok: true;
  /** Número enviado al body (normalizado 52 + 10 dígitos). */
  number: string;
  /** Respuesta cruda de Evolution (útil para depuración en la UI de prueba). */
  responseJson: unknown;
};

/**
 * Envía un mensaje de texto por Evolution API (self-hosted).
 * POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
 */
export async function sendEvolutionText(
  number: string,
  text: string,
): Promise<SendEvolutionTextResult> {
  const normalized = normalizeEvolutionWhatsAppNumber(number);
  const { baseUrl, instance, apiKey } = getEvolutionConfig();

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: normalized,
      text,
    }),
  });

  let responseJson: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();
  if (rawText) {
    if (contentType.includes("application/json")) {
      try {
        responseJson = JSON.parse(rawText) as unknown;
      } catch {
        responseJson = rawText;
      }
    } else {
      responseJson = rawText;
    }
  }

  if (!response.ok) {
    throw new Error(formatEvolutionError(response.status, responseJson));
  }

  return {
    ok: true,
    number: normalized,
    responseJson,
  };
}
