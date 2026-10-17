export type SendDodaLiberadoApiInput = {
  to: string;
  integracion: string;
  pedimento: string;
  fecha: string;
};

export type SendDodaLiberadoApiResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

/**
 * Calls `POST /api/whatsapp/send-doda` from the browser or a Server Action.
 */
export async function requestSendDodaLiberadoWhatsApp(
  input: SendDodaLiberadoApiInput,
): Promise<SendDodaLiberadoApiResult> {
  const response = await fetch("/api/whatsapp/send-doda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    sid?: string;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.sid) {
    return {
      ok: false,
      error: payload.error ?? "No se pudo enviar el mensaje de DODA liberado",
    };
  }

  return { ok: true, sid: payload.sid };
}
