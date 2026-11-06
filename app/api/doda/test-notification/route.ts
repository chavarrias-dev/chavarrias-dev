import { NextResponse } from "next/server";
import {
  normalizeWhatsAppIndividualRecipient,
  parseDodaBatchNotifySettings,
} from "@/lib/doda-notification-config";
import { sendEvolutionText } from "@/lib/evolution-whatsapp";
import { buildDodaLiberatedWhatsAppMessage } from "@/lib/doda-external-notifications";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  let batch;
  try {
    batch = await parseDodaBatchNotifySettings(supabase, {
      notify_type: body.notify_type,
      notify_whatsapp_number: body.notify_whatsapp_number,
      notify_whatsapp_group_id: body.notify_whatsapp_group_id,
    });
  } catch (notifyErr) {
    const msg =
      notifyErr instanceof Error
        ? notifyErr.message
        : "Configuración de notificación inválida";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  if (!batch.notify_type) {
    return NextResponse.json(
      {
        ok: false,
        error: "Indica un número individual o un ID de grupo válido",
      },
      { status: 400 },
    );
  }

  if (batch.notify_type === "group") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La prueba por Evolution API solo está disponible en modo número individual. Cambia a «Número» e introduce el mismo valor que usarías en notify_whatsapp_number.",
      },
      { status: 400 },
    );
  }

  let toRaw: string | null = null;
  if (batch.notify_type === "individual" && batch.notify_whatsapp_number) {
    toRaw = normalizeWhatsAppIndividualRecipient(batch.notify_whatsapp_number);
  }

  if (!toRaw) {
    return NextResponse.json(
      { ok: false, error: "Destino de WhatsApp inválido" },
      { status: 400 },
    );
  }

  const testText = buildDodaLiberatedWhatsAppMessage({
    integrationNumber: "149066025",
    pedimento: "300-1754-6003278/6",
    tipoPedimento: "N/A",
    changedAt: new Date().toISOString(),
  });

  try {
    const result = await sendEvolutionText(toRaw, testText);
    return NextResponse.json({
      ok: true,
      provider: "evolution" as const,
      evolution: {
        number: result.number,
        response: result.responseJson,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al enviar el mensaje de prueba por Evolution API.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
