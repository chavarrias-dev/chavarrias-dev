"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    console.error("[login] Invalid credentials payload", {
      emailType: typeof email,
      passwordType: typeof password,
    });
    redirect("/login?error=Credenciales%20invalidas");
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[login] signInWithPassword failed", {
      email,
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name,
    });
    redirect("/login?error=Correo%20o%20contrasena%20incorrectos");
  }

  console.log("[login] signInWithPassword success", {
    email,
    userId: data.user?.id,
    hasSession: Boolean(data.session),
  });
  console.log("[login] Redirecting to /dashboard");
  redirect("/dashboard");
}
