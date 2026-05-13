import "server-only";

import type { ExtractedConstanciaData } from "@/lib/extract-constancia-types";
import { ANTHROPIC_PDF_MODEL } from "@/lib/extract-pdf-data";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function pickStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function parseAssistantJson(text: string): ExtractedConstanciaData {
  let raw = text.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m.exec(raw);
  if (fenced?.[1]) {
    raw = fenced[1].trim();
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    rfc: pickStr(parsed.rfc)?.toUpperCase() ?? null,
    curp: pickStr(parsed.curp)?.toUpperCase() ?? null,
    nombre: pickStr(parsed.nombre),
    primer_apellido: pickStr(parsed.primer_apellido),
    segundo_apellido: pickStr(parsed.segundo_apellido),
    codigo_postal: pickStr(parsed.codigo_postal),
    direccion: pickStr(parsed.direccion),
    fecha_inicio_operaciones: pickStr(parsed.fecha_inicio_operaciones),
  };
}

/**
 * Reads a Mexican Constancia de Situación Fiscal PDF and returns structured fields via Claude.
 */
export async function extractConstanciaData(
  file: File,
): Promise<ExtractedConstanciaData> {
  if (file.type !== "application/pdf") {
    throw new Error("Solo se permiten archivos PDF");
  }
  if (file.size === 0) {
    throw new Error("El archivo está vacío");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("El PDF es demasiado grande (máximo 10 MB)");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ANTHROPIC_API_KEY no está configurada");
  }

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_PDF_MODEL;

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  const instruction = `Analiza este PDF de una Constancia de Situación Fiscal (SAT, México).
Extrae estos campos si aparecen en el documento. Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto adicional.
Claves requeridas en el JSON (usa null si no encuentras el dato):
- "rfc": RFC con homoclave (13 caracteres persona moral o 12 persona física), mayúsculas, sin espacios
- "curp": CURP si es persona física, mayúsculas, sin espacios; si es moral, null
- "nombre": nombre de pila (persona física) o razón social corta sin apellidos cuando aplique
- "primer_apellido": primer apellido (persona física), o null
- "segundo_apellido": segundo apellido (persona física), o null
- "codigo_postal": código postal del domicilio fiscal (5 dígitos típicamente)
- "direccion": domicilio fiscal en una sola línea (calle, número, colonia, ciudad, estado si constan)
- "fecha_inicio_operaciones": fecha tal como en el documento (preferible formato DD/MM/YYYY si es legible)`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: instruction,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Error del servicio de extracción (${res.status}). ${errBody.slice(0, 200)}`,
    );
  }

  const body = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const block = body.content?.find((c) => c.type === "text" && c.text);
  const text = block?.text;
  if (!text?.trim()) {
    throw new Error("Respuesta vacía del modelo");
  }

  try {
    return parseAssistantJson(text);
  } catch {
    throw new Error("No se pudo interpretar la respuesta del modelo");
  }
}
