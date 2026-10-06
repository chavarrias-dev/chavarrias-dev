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
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";

function buildTestWhatsAppMessage(): string {
  const fecha = new Date(normalizeDodaTimestamp(new Date().toISOString())).toLocaleString(
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

  return [
    "🧪 *Mensaje de prueba - Chavarrias CRM*",
    "",
    "✅ Las notificaciones de DODA están configuradas correctamente.",
    "",
    "Cuando un DODA sea liberado recibirás un mensaje como este:",
    "",
    "🟢 *DODA Liberado*",
    "Número: *149066025*",
    "📋 Pedimento: 300-1754-6003278/6",
    `📅 ${fecha}`,
    "",
    "_Chavarrias Servicios Aduanales_",
  ].join("\n");
}

type TestBody = {
  notify_type?: string | null;
  notify_whatsapp_number?: string | null;
  notify_whatsapp_group_id?: string | null;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Solo administradores pueden enviar pruebas" },
      { status: 403 },
    );
  }

  let body: TestBody;
  try {
    body = (await req.json()) as TestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const batch = parseDodaBatchNotifySettings({
    notify_type: body.notify_type,
    notify_whatsapp_number: body.notify_whatsapp_number,
    notify_whatsapp_group_id: body.notify_whatsapp_group_id,
  });

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

  if (!to) {
    return NextResponse.json(
      { ok: false, error: "Destino de WhatsApp inválido" },
      { status: 400 },
    );
  }

  try {
    const saved = await sendWhatsAppMessage(to, buildTestWhatsAppMessage());
    if (!saved) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mensaje se envió pero no se pudo guardar en el historial de WhatsApp",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar WhatsApp";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
