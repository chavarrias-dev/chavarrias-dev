"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
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

export async function updateClient(formData: FormData) {
  const { supabase, user } = await requireStaff();

  const rawId = formData.get("client_id");
  if (typeof rawId !== "string" || !rawId.trim()) {
    redirect("/dashboard/clients?error=Identificador%20invalido");
  }
  const clientId = rawId.trim();

  const fullName = formData.get("full_name");
  const email = formData.get("email");

  if (typeof fullName !== "string" || !fullName.trim()) {
    redirect(
      `/dashboard/clients/${clientId}/edit?error=${encodeURIComponent("Nombre requerido")}`,
    );
  }
  if (typeof email !== "string" || !email.trim()) {
    redirect(
      `/dashboard/clients/${clientId}/edit?error=${encodeURIComponent("Correo requerido")}`,
    );
  }

  const { error } = await supabase
    .from("clients")
    .update({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: emptyToNull(formData.get("phone")),
      company_name: emptyToNull(formData.get("company_name")),
      rfc: emptyToNull(formData.get("rfc")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", clientId);

  if (error) {
    redirect(
      `/dashboard/clients/${clientId}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó cliente",
    entityType: "cliente",
    entityId: clientId,
    entityName: fullName.trim(),
  });

  redirect("/dashboard/clients");
}

export async function deleteClient(formData: FormData) {
  const { supabase, user } = await requireStaff();

  const rawId = formData.get("client_id");
  if (typeof rawId !== "string" || !rawId.trim()) {
    redirect("/dashboard/clients?error=Identificador%20invalido");
  }
  const clientId = rawId.trim();

  const { data: existing } = await supabase
    .from("clients")
    .select("full_name")
    .eq("id", clientId)
    .maybeSingle();

  const displayName =
    (existing as { full_name: string } | null)?.full_name?.trim() ?? clientId;

  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó cliente",
    entityType: "cliente",
    entityId: clientId,
    entityName: displayName,
  });

  redirect("/dashboard/clients");
}
