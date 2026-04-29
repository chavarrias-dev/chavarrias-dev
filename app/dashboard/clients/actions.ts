"use server";

import { redirect } from "next/navigation";
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
  return supabase;
}

export async function updateClient(formData: FormData) {
  const supabase = await requireStaff();

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

  redirect("/dashboard/clients");
}

export async function deleteClient(formData: FormData) {
  const supabase = await requireStaff();

  const rawId = formData.get("client_id");
  if (typeof rawId !== "string" || !rawId.trim()) {
    redirect("/dashboard/clients?error=Identificador%20invalido");
  }
  const clientId = rawId.trim();

  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/dashboard/clients");
}
