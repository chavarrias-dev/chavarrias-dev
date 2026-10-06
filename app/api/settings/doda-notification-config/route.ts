import { NextResponse } from "next/server";
import {
  formatDodaNotificationDestination,
  formatPhoneDisplay,
  getLatestDodaNotificationConfig,
  normalizeWhatsAppGroupRecipient,
  normalizeWhatsAppIndividualRecipient,
  type DodaNotificationConfigRecord,
  type DodaNotificationConfigType,
} from "@/lib/doda-notification-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function serializeConfig(config: DodaNotificationConfigRecord | null) {
  return {
    config: config
      ? {
          id: config.id,
          type: config.type,
          whatsapp_number: config.whatsapp_number,
          whatsapp_group_id: config.whatsapp_group_id,
          created_at: config.created_at,
        }
      : null,
    destinationLabel: formatDodaNotificationDestination(config),
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const config = await getLatestDodaNotificationConfig(supabase);
  return NextResponse.json({ ok: true, ...serializeConfig(config) });
}

type SaveBody = {
  type?: DodaNotificationConfigType;
  whatsapp_number?: string;
  whatsapp_group_id?: string;
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
      { ok: false, error: "Solo administradores pueden cambiar esta configuración" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as SaveBody | null;
  if (!body?.type || (body.type !== "individual" && body.type !== "group")) {
    return NextResponse.json(
      { ok: false, error: "Tipo de notificación inválido" },
      { status: 400 },
    );
  }

  let whatsappNumber: string | null = null;
  let whatsappGroupId: string | null = null;

  if (body.type === "individual") {
    const raw = body.whatsapp_number?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Ingresa un número de teléfono" },
        { status: 400 },
      );
    }
    if (!normalizeWhatsAppIndividualRecipient(raw)) {
      return NextResponse.json(
        { ok: false, error: "Número de teléfono inválido" },
        { status: 400 },
      );
    }
    whatsappNumber = formatPhoneDisplay(raw);
  } else {
    const raw = body.whatsapp_group_id?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Ingresa el ID del grupo de WhatsApp" },
        { status: 400 },
      );
    }
    if (!normalizeWhatsAppGroupRecipient(raw)) {
      return NextResponse.json(
        { ok: false, error: "ID de grupo inválido" },
        { status: 400 },
      );
    }
    whatsappGroupId = raw.replace(/@g\.us$/i, "").trim();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("doda_notification_config")
    .insert({
      type: body.type,
      whatsapp_number: whatsappNumber,
      whatsapp_group_id: whatsappGroupId,
      created_by: user.id,
    })
    .select(
      "id, type, whatsapp_number, whatsapp_group_id, created_by, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "No se pudo guardar la configuración" },
      { status: 500 },
    );
  }

  const config = data as DodaNotificationConfigRecord;
  return NextResponse.json({ ok: true, ...serializeConfig(config) });
}
