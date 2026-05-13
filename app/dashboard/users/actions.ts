"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/supabase/profile-role";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function parseRole(raw: unknown): ProfileRole | null {
  if (raw === "admin" || raw === "empleado" || raw === "cliente") {
    return raw;
  }
  return null;
}

async function requireStaff() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "empleado") {
    redirect("/dashboard");
  }
  return { supabase, user };
}

export async function createUser(formData: FormData) {
  const { supabase: actorSupabase, user: actor } = await requireStaff();

  const fullName = formData.get("full_name");
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const passwordConfirmRaw = formData.get("password_confirm");

  if (typeof fullName !== "string" || !fullName.trim()) {
    redirect("/dashboard/users/new?error=Nombre%20requerido");
  }
  if (typeof emailRaw !== "string" || !emailRaw.trim()) {
    redirect("/dashboard/users/new?error=Correo%20requerido");
  }

  const role = parseRole(formData.get("role"));
  if (!role) {
    redirect("/dashboard/users/new?error=Rol%20invalido");
  }

  if (role === "cliente") {
    const constanciaEarly = formData.get("constancia_fiscal");
    if (
      constanciaEarly instanceof File &&
      constanciaEarly.size > 0 &&
      constanciaEarly.type !== "application/pdf"
    ) {
      redirect(
        `/dashboard/users/new?error=${encodeURIComponent("Solo se permiten archivos PDF para la constancia")}`,
      );
    }
  }

  if (typeof passwordRaw !== "string" || passwordRaw.trim().length < 6) {
    redirect(
      "/dashboard/users/new?error=Contrase%C3%B1a%20requerida%20%286%20caracteres%20m%C3%ADnimo%29",
    );
  }
  if (
    typeof passwordConfirmRaw !== "string" ||
    passwordRaw !== passwordConfirmRaw
  ) {
    redirect(
      `/dashboard/users/new?error=${encodeURIComponent("Las contraseñas no coinciden")}`,
    );
  }

  const email = emailRaw.trim().toLowerCase();
  const phone = emptyToNull(formData.get("phone"));
  const companyName = emptyToNull(formData.get("company_name"));
  const rfc = emptyToNull(formData.get("rfc"));
  const curp = emptyToNull(formData.get("curp"));
  const codigoPostal = emptyToNull(formData.get("codigo_postal"));
  const direccion = emptyToNull(formData.get("direccion"));
  const fechaInicioOperaciones = emptyToNull(
    formData.get("fecha_inicio_operaciones"),
  );

  const admin = createSupabaseAdminClient();

  const meta: Record<string, string> = { full_name: fullName.trim() };
  if (phone) {
    meta.phone = phone;
  }

  const { data: created, error: authErr } =
    await admin.auth.admin.createUser({
      email,
      password: passwordRaw as string,
      email_confirm: true,
      user_metadata: meta,
    });

  if (authErr || !created?.user) {
    redirect(
      `/dashboard/users/new?error=${encodeURIComponent(authErr?.message ?? "Error al crear usuario en Auth")}`,
    );
  }
  const uid = created.user.id;

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: uid,
      email,
      role,
      full_name: fullName.trim(),
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    await admin.auth.admin.deleteUser(uid);
    redirect(
      `/dashboard/users/new?error=${encodeURIComponent(profileErr.message)}`,
    );
  }

  if (role === "cliente") {
    const constanciaFile = formData.get("constancia_fiscal");

    const { data: insertedClient, error: clientErr } = await admin
      .from("clients")
      .insert({
        full_name: fullName.trim(),
        email,
        phone,
        company_name: companyName,
        rfc,
        curp,
        codigo_postal: codigoPostal,
        direccion,
        fecha_inicio_operaciones: fechaInicioOperaciones,
        notes: null,
      })
      .select("id")
      .single<{ id: string }>();

    if (clientErr || !insertedClient) {
      await admin.from("profiles").delete().eq("id", uid);
      await admin.auth.admin.deleteUser(uid);
      redirect(
        `/dashboard/users/new?error=${encodeURIComponent(clientErr?.message ?? "Error al crear cliente")}`,
      );
    }

    const clientId = insertedClient.id;

    if (
      constanciaFile instanceof File &&
      constanciaFile.size > 0
    ) {
      const path = `constancias/${clientId}.pdf`;
      const { error: upErr } = await admin.storage
        .from(CRM_DOCUMENTS_BUCKET)
        .upload(path, constanciaFile, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (upErr) {
        await admin.from("clients").delete().eq("id", clientId);
        await admin.from("profiles").delete().eq("id", uid);
        await admin.auth.admin.deleteUser(uid);
        redirect(
          `/dashboard/users/new?error=${encodeURIComponent(upErr.message)}`,
        );
      }

      const { data: pub } = admin.storage
        .from(CRM_DOCUMENTS_BUCKET)
        .getPublicUrl(path);

      const { error: urlErr } = await admin
        .from("clients")
        .update({ constancia_url: pub.publicUrl })
        .eq("id", clientId);

      if (urlErr) {
        await admin.storage.from(CRM_DOCUMENTS_BUCKET).remove([path]);
        await admin.from("clients").delete().eq("id", clientId);
        await admin.from("profiles").delete().eq("id", uid);
        await admin.auth.admin.deleteUser(uid);
        redirect(
          `/dashboard/users/new?error=${encodeURIComponent(urlErr.message)}`,
        );
      }
    }

    await logActivity(actorSupabase, {
      userId: actor.id,
      userEmail: actor.email ?? "",
      action: "creó usuario",
      entityType: "usuario",
      entityId: uid,
      entityName: fullName.trim(),
    });

    redirect("/dashboard/users");
  }

  await logActivity(actorSupabase, {
    userId: actor.id,
    userEmail: actor.email ?? "",
    action: "creó usuario",
    entityType: "usuario",
    entityId: uid,
    entityName: fullName.trim(),
  });

  redirect("/dashboard/users");
}

export async function updateUser(formData: FormData) {
  await requireStaff();

  const userId = formData.get("user_id");
  if (typeof userId !== "string" || !userId.trim()) {
    redirect("/dashboard/users?error=Identificador%20invalido");
  }
  const id = userId.trim();

  const fullName = formData.get("full_name");
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  if (typeof fullName !== "string" || !fullName.trim()) {
    redirect(`/dashboard/users/${id}/edit?error=Nombre%20requerido`);
  }
  if (typeof emailRaw !== "string" || !emailRaw.trim()) {
    redirect(`/dashboard/users/${id}/edit?error=Correo%20requerido`);
  }

  const role = parseRole(formData.get("role"));
  if (!role) {
    redirect(`/dashboard/users/${id}/edit?error=Rol%20invalido`);
  }

  const email = emailRaw.trim().toLowerCase();
  const phone = emptyToNull(formData.get("phone"));
  const companyName = emptyToNull(formData.get("company_name"));
  const rfc = emptyToNull(formData.get("rfc"));

  if (
    typeof passwordRaw === "string" &&
    passwordRaw.trim() &&
    passwordRaw.trim().length < 6
  ) {
    redirect(
      `/dashboard/users/${id}/edit?error=Contrase%C3%B1a%20m%C3%ADnimo%206%20caracteres`,
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: existing, error: loadErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      email: string;
      role: ProfileRole | null;
    }>();

  if (loadErr || !existing) {
    redirect("/dashboard/users?error=Usuario%20no%20encontrado");
  }

  const oldEmail = existing.email.trim().toLowerCase();

  const authUpdate: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, string>;
  } = {};

  if (email !== oldEmail) {
    authUpdate.email = email;
  }
  if (typeof passwordRaw === "string" && passwordRaw.trim()) {
    authUpdate.password = passwordRaw.trim();
  }

  const meta: Record<string, string> = { full_name: fullName.trim() };
  if (phone) {
    meta.phone = phone;
  }
  authUpdate.user_metadata = meta;

  const { error: authUpdErr } =
    await admin.auth.admin.updateUserById(id, authUpdate);

  if (authUpdErr) {
    redirect(
      `/dashboard/users/${id}/edit?error=${encodeURIComponent(authUpdErr.message)}`,
    );
  }

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      email,
      role,
      full_name: fullName.trim(),
    })
    .eq("id", id);

  if (profErr) {
    redirect(
      `/dashboard/users/${id}/edit?error=${encodeURIComponent(profErr.message)}`,
    );
  }

  if (role === "cliente") {
    const { data: clientRow } = await admin
      .from("clients")
      .select("id")
      .eq("email", oldEmail)
      .maybeSingle<{ id: string }>();

    if (clientRow?.id) {
      const { error: cErr } = await admin
        .from("clients")
        .update({
          full_name: fullName.trim(),
          email,
          phone,
          company_name: companyName,
          rfc,
        })
        .eq("id", clientRow.id);
      if (cErr) {
        redirect(
          `/dashboard/users/${id}/edit?error=${encodeURIComponent(cErr.message)}`,
        );
      }
    } else {
      const { error: insErr } = await admin.from("clients").insert({
        full_name: fullName.trim(),
        email,
        phone,
        company_name: companyName,
        rfc,
        notes: null,
      });
      if (insErr) {
        redirect(
          `/dashboard/users/${id}/edit?error=${encodeURIComponent(insErr.message)}`,
        );
      }
    }
  } else if (existing.role === "cliente") {
    await admin.from("clients").delete().eq("email", oldEmail);
  }

  redirect("/dashboard/users");
}

export async function deleteUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const actorRole = await getUserRole(supabase, user.id);
  if (actorRole !== "admin") {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(
        "Solo los administradores pueden eliminar usuarios.",
      )}`,
    );
  }

  const raw = formData.get("user_id");
  if (typeof raw !== "string" || !raw.trim()) {
    redirect("/dashboard/users?error=Identificador%20invalido");
  }
  const targetId = raw.trim();

  if (targetId === user.id) {
    redirect(
      "/dashboard/users?error=No%20puedes%20eliminar%20tu%20propia%20cuenta",
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileLoadErr } = await admin
    .from("profiles")
    .select("email, role, full_name")
    .eq("id", targetId)
    .maybeSingle<{
      email: string;
      role: ProfileRole | null;
      full_name: string | null;
    }>();

  if (profileLoadErr || !profile) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(profileLoadErr?.message ?? "Usuario no encontrado")}`,
    );
  }

  const emailNorm = profile.email.trim().toLowerCase();

  if (profile.role === "cliente") {
    const { error: clientErr } = await admin
      .from("clients")
      .delete()
      .eq("email", emailNorm);
    if (clientErr) {
      redirect(
        `/dashboard/users?error=${encodeURIComponent(clientErr.message)}`,
      );
    }
  }

  const { error: profileDelErr } = await admin
    .from("profiles")
    .delete()
    .eq("id", targetId);

  if (profileDelErr) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(profileDelErr.message)}`,
    );
  }

  const { error: authDelErr } = await admin.auth.admin.deleteUser(targetId);

  if (authDelErr) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(authDelErr.message)}`,
    );
  }

  const entityDisplay =
    profile.full_name?.trim() || emailNorm;

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó usuario",
    entityType: "usuario",
    entityId: targetId,
    entityName: entityDisplay,
  });

  redirect("/dashboard/users");
}
