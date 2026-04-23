"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function saveClient(formData: FormData) {
  const fullName = formData.get("full_name");
  const email = formData.get("email");

  if (typeof fullName !== "string" || !fullName.trim()) {
    redirect("/dashboard/clients/new?error=Nombre%20requerido");
  }
  if (typeof email !== "string" || !email.trim()) {
    redirect("/dashboard/clients/new?error=Correo%20requerido");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("clients").insert({
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: emptyToNull(formData.get("phone")),
    company_name: emptyToNull(formData.get("company_name")),
    rfc: emptyToNull(formData.get("rfc")),
    notes: emptyToNull(formData.get("notes")),
  });

  if (error) {
    redirect(
      `/dashboard/clients/new?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/dashboard/clients");
}
