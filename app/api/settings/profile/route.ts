import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACCEPTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function inferExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const fullNameRaw = formData.get("full_name");
  const emailRaw = formData.get("email");
  const avatarFile = formData.get("avatar");

  const fullName = typeof fullNameRaw === "string" ? fullNameRaw.trim() : "";
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";

  if (!fullName) {
    return NextResponse.json(
      { ok: false, error: "El nombre es obligatorio" },
      { status: 400 },
    );
  }
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "El correo es obligatorio" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  let avatarUrl: string | undefined;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!ACCEPTED_AVATAR_TYPES.has(avatarFile.type)) {
      return NextResponse.json(
        { ok: false, error: "Formato de imagen no soportado (usa JPG, PNG, WEBP o GIF)" },
        { status: 400 },
      );
    }

    const path = `avatars/${user.id}.${inferExtension(avatarFile)}`;
    const { error: uploadError } = await admin.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, avatarFile, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: `Error al subir la imagen: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = admin.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  const currentEmail = (user.email ?? "").trim().toLowerCase();
  let emailChangeRequested = false;

  if (email !== currentEmail) {
    const { error: authError } = await supabase.auth.updateUser({ email });
    if (authError) {
      return NextResponse.json({ ok: false, error: authError.message }, { status: 400 });
    }
    emailChangeRequested = true;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      email,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: currentEmail,
    action: "actualizó su perfil",
    entityType: "usuario",
    entityId: user.id,
    entityName: fullName,
  });

  return NextResponse.json({
    ok: true,
    avatar_url: avatarUrl,
    email_change_requested: emailChangeRequested,
  });
}
