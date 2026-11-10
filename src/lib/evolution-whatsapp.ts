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
/**
 * Destino Evolution: números individuales → 52 + 10 dígitos;
 * grupos (solo dígitos que empiezan con 1203) → `digits@g.us`.
 */
export function resolveEvolutionDestination(raw: string): string {
  const trimmed = raw.trim();
  if (/@g\.us$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed) && trimmed.startsWith("1203")) {
    return `${trimmed}@g.us`;
  }
  return normalizeEvolutionWhatsAppNumber(trimmed);
}

export async function sendEvolutionText(
  number: string,
  text: string,
): Promise<SendEvolutionTextResult> {
  const normalized = resolveEvolutionDestination(number);
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

/** Grupo devuelto por Evolution (`fetchAllGroups`): id + asunto visible. */
export type EvolutionGroupSummary = {
  id: string;
  subject: string;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function extractGroupId(raw: unknown): string | null {
  const s = asNonEmptyString(raw);
  if (s) {
    return s;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return (
      asNonEmptyString(o.id) ??
      asNonEmptyString(o.jid) ??
      asNonEmptyString(o.groupId) ??
      null
    );
  }
  return null;
}

function extractSubject(raw: unknown): string {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const sub =
      asNonEmptyString(o.subject) ??
      asNonEmptyString(o.name) ??
      asNonEmptyString(o.groupName);
    if (sub) {
      return sub;
    }
  }
  return "Sin nombre";
}

function extractGroupsArray(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const candidates = [
      o.data,
      o.groups,
      o.group,
      o.response,
      o.result,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        return c;
      }
      if (c && typeof c === "object" && Array.isArray((c as { data?: unknown }).data)) {
        return (c as { data: unknown[] }).data;
      }
    }
  }
  return [];
}

/**
 * Lista grupos de WhatsApp desde Evolution API (instancia configurada en env).
 * GET `{EVOLUTION_API_URL}/group/fetchAllGroups/{EVOLUTION_INSTANCE}?getParticipants=false`
 */
export async function fetchEvolutionGroups(): Promise<EvolutionGroupSummary[]> {
  const { baseUrl, instance, apiKey } = getEvolutionConfig();

  const url = `${baseUrl}/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: apiKey,
    },
  });

  let body: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();
  if (rawText) {
    if (contentType.includes("application/json")) {
      try {
        body = JSON.parse(rawText) as unknown;
      } catch {
        body = rawText;
      }
    } else {
      body = rawText;
    }
  }

  if (!response.ok) {
    throw new Error(formatEvolutionError(response.status, body));
  }

  const items = extractGroupsArray(body);
  const seen = new Set<string>();
  const out: EvolutionGroupSummary[] = [];

  for (const item of items) {
    const id = extractGroupId(item);
    if (!id) {
      continue;
    }
    const key = id.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push({
      id: id.trim(),
      subject: extractSubject(item),
    });
  }

  return out;
}
