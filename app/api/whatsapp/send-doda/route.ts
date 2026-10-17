import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendDodaLiberadoWhatsApp,
  TwilioConfigError,
} from "@/lib/twilio";

export const runtime = "nodejs";

type SendDodaBody = {
  to?: string;
  integracion?: string;
  pedimento?: string;
  fecha?: string;
};

function missingFields(body: SendDodaBody): string[] {
  const required: (keyof SendDodaBody)[] = [
    "to",
    "integracion",
    "pedimento",
    "fecha",
  ];
  return required.filter((key) => !body[key]?.trim());
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    return NextResponse.json({ ok: false, error: "Sin permiso" }, { status: 403 });
  }

  let body: SendDodaBody;
  try {
    body = (await req.json()) as SendDodaBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const missing = missingFields(body);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Faltan campos obligatorios: ${missing.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await sendDodaLiberadoWhatsApp({
      to: body.to!.trim(),
      integracion: body.integracion!.trim(),
      pedimento: body.pedimento!.trim(),
      fecha: body.fecha!.trim(),
    });

    return NextResponse.json({
      ok: true,
      sid: result.sid,
      message: result.record,
    });
  } catch (error) {
    if (error instanceof TwilioConfigError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Error al enviar WhatsApp";
    console.error("[api/whatsapp/send-doda]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
