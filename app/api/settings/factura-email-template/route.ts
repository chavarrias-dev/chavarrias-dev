import { NextResponse } from "next/server";
import {
  FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS,
  loadFacturaEmailTemplateSettings,
  saveFacturaEmailTemplateSettings,
  validateFacturaEmailBodyTemplate,
  validateFacturaEmailSignatureUrl,
} from "@/lib/factura-email-settings";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function serialize(settings: {
  bodyTemplate: string;
  signatureUrl: string;
  updatedAt: string | null;
}) {
  return {
    body_template: settings.bodyTemplate,
    signature_url: settings.signatureUrl,
    updated_at: settings.updatedAt,
    placeholders: [...FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS],
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

  const settings = await loadFacturaEmailTemplateSettings(supabase);

  return NextResponse.json({
    ok: true,
    settings: serialize(settings),
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

  try {
    const result = await saveFacturaEmailTemplateSettings(supabase, {
      bodyTemplate,
      signatureUrl,
      updatedBy: user.id,
    });

    return NextResponse.json({
      ok: true,
      settings: serialize(result.settings),
      storage_fallback: result.usedStorageFallback,
    });
  } catch (error) {
    console.error("[factura-email-template] POST", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo guardar la plantilla",
      },
      { status: 500 },
    );
  }
}
