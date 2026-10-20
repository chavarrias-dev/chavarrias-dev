import { NextResponse } from "next/server";
import {
  DODA_DISPLAY_TIMEZONE,
  normalizeDodaTimestamp,
} from "@/components/dodas/doda-display-utils";
import {
  normalizeWhatsAppGroupRecipient,
  normalizeWhatsAppIndividualRecipient,
  parseDodaBatchNotifySettings,
} from "@/lib/doda-notification-config";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EXPECTED_DODA_CONTENT_SID,
  formatTwilioWhatsAppTo,
  getTwilioAccountSid,
  getTwilioTemplateDodaSid,
  getTwilioWhatsAppFrom,
  sendDodaLiberadoWhatsApp,
} from "@/lib/twilio";

export const runtime = "nodejs";

function buildTestTemplateFecha(): string {
  return new Date(normalizeDodaTimestamp(new Date().toISOString())).toLocaleString(
    "es-MX",
    {
      timeZone: DODA_DISPLAY_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

type TestBody = {
  notify_type?: string | null;
  notify_whatsapp_number?: string | null;
  notify_whatsapp_group_id?: string | null;
};

export async function POST(req: Request) {
  console.log("[doda/test-notification] POST start");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[doda/test-notification] rejected: no user");
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  console.log("[doda/test-notification] user", user.id);

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    console.log("[doda/test-notification] rejected: role", role);
    return NextResponse.json(
      { ok: false, error: "Solo administradores pueden enviar pruebas" },
      { status: 403 },
    );
  }

  let body: TestBody;
  try {
    body = (await req.json()) as TestBody;
    console.log("[doda/test-notification] body", {
      notify_type: body.notify_type,
      notify_whatsapp_number: body.notify_whatsapp_number,
      notify_whatsapp_group_id: body.notify_whatsapp_group_id,
    });
  } catch {
    console.log("[doda/test-notification] invalid JSON");
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const batch = parseDodaBatchNotifySettings({
    notify_type: body.notify_type,
    notify_whatsapp_number: body.notify_whatsapp_number,
    notify_whatsapp_group_id: body.notify_whatsapp_group_id,
  });

  console.log("[doda/test-notification] parsed batch", batch);

  if (!batch.notify_type) {
    return NextResponse.json(
      {
        ok: false,
        error: "Indica un número individual o un ID de grupo válido",
      },
      { status: 400 },
    );
  }

  let to: string | null = null;
  if (batch.notify_type === "individual" && batch.notify_whatsapp_number) {
    to = normalizeWhatsAppIndividualRecipient(batch.notify_whatsapp_number);
  } else if (batch.notify_type === "group" && batch.notify_whatsapp_group_id) {
    to = normalizeWhatsAppGroupRecipient(batch.notify_whatsapp_group_id);
  }

  console.log("[doda/test-notification] destination digits (raw):", to);

  if (!to) {
    return NextResponse.json(
      { ok: false, error: "Destino de WhatsApp inválido" },
      { status: 400 },
    );
  }

  try {
    const accountSid = getTwilioAccountSid();
    const from = getTwilioWhatsAppFrom();
    const contentSid = getTwilioTemplateDodaSid();
    const toFormatted = formatTwilioWhatsAppTo(to);

    console.log("[doda/test-notification] Twilio env snapshot", {
      accountSid,
      from,
      contentSid,
      expectedContentSid: EXPECTED_DODA_CONTENT_SID,
      contentSidMatchesExpected: contentSid === EXPECTED_DODA_CONTENT_SID,
      toDigits: to,
      toFormatted,
    });

    const payload = {
      to,
      integracion: "149066025",
      pedimento: "300-1754-6003278/6",
      fecha: buildTestTemplateFecha(),
    };
    console.log("[doda/test-notification] calling sendDodaLiberadoWhatsApp", payload);

    const result = await sendDodaLiberadoWhatsApp(payload);

    console.log("[doda/test-notification] send result", {
      sid: result.sid,
      savedToDb: Boolean(result.record),
    });

    if (!result.record) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla se envió pero no se pudo guardar en el historial de WhatsApp",
          sid: result.sid,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, sid: result.sid });
  } catch (error) {
    console.error("[doda/test-notification] send failed", error);
    const message =
      error instanceof Error ? error.message : "Error al enviar WhatsApp";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
