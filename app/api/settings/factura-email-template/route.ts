import { NextResponse } from "next/server";
import {
  DEFAULT_FACTURA_BODY_TEMPLATE,
  DEFAULT_FACTURA_SIGNATURE_URL,
  FACTURA_EMAIL_SETTINGS_ID,
  validateFacturaEmailBodyTemplate,
  validateFacturaEmailSignatureUrl,
} from "@/lib/factura-email-settings";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SettingsRow = {
  body_template: string;
  signature_url: string;
  updated_at: string | null;
};

function serialize(row: SettingsRow | null) {
  return {
    body_template: row?.body_template?.trim() || DEFAULT_FACTURA_BODY_TEMPLATE,
    signature_url: row?.signature_url?.trim() || DEFAULT_FACTURA_SIGNATURE_URL,
    updated_at: row?.updated_at ?? null,
    placeholders: ["{{nombre}}", "{{numero}}", "{{fecha}}", "{{monto}}"],
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
  if (role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Solo administradores pueden ver esta configuración" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("factura_email_settings")
    .select("body_template, signature_url, updated_at")
    .eq("id", FACTURA_EMAIL_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("[factura-email-template] GET", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    settings: serialize((data as SettingsRow | null) ?? null),
  });
}

type SaveBody = {
  body_template?: string;
  signature_url?: string;
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
  const bodyTemplate =
    typeof body?.body_template === "string" ? body.body_template : "";
  const signatureUrl =
    typeof body?.signature_url === "string" ? body.signature_url : "";

  const bodyErr = validateFacturaEmailBodyTemplate(bodyTemplate);
  if (bodyErr) {
    return NextResponse.json({ ok: false, error: bodyErr }, { status: 400 });
  }

  const urlErr = validateFacturaEmailSignatureUrl(signatureUrl);
  if (urlErr) {
    return NextResponse.json({ ok: false, error: urlErr }, { status: 400 });
  }

  const payload = {
    id: FACTURA_EMAIL_SETTINGS_ID,
    body_template: bodyTemplate.trim(),
    signature_url: signatureUrl.trim(),
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from("factura_email_settings")
    .upsert(payload, { onConflict: "id" })
    .select("body_template, signature_url, updated_at")
    .single();

  if (error) {
    console.error("[factura-email-template] POST", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    settings: serialize(data as SettingsRow),
  });
}
