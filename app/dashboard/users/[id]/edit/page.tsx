import { notFound, redirect } from "next/navigation";
import type { ProfileRole } from "@/lib/supabase/middleware";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EditUserForm } from "./edit-user-form";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditUserPage({ params, searchParams }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      email: string;
      role: ProfileRole | null;
      full_name: string | null;
    }>();

  if (profileErr || !profile) {
    notFound();
  }

  const { data: authWrap } = await admin.auth.admin.getUserById(id);
  const meta = authWrap?.user?.user_metadata as
    | Record<string, unknown>
    | undefined;
  const metaPhone =
    typeof meta?.phone === "string" ? meta.phone : "";

  let initialPhone = metaPhone;
  let initialCompanyName = "";
  let initialRfc = "";

  if (profile.role === "cliente") {
    const { data: clientRow } = await admin
      .from("clients")
      .select("phone, company_name, rfc")
      .eq("email", profile.email.trim().toLowerCase())
      .maybeSingle<{
        phone: string | null;
        company_name: string | null;
        rfc: string | null;
      }>();

    if (clientRow) {
      initialPhone = clientRow.phone ?? "";
      initialCompanyName = clientRow.company_name ?? "";
      initialRfc = clientRow.rfc ?? "";
    }
  }

  const sp = await searchParams;
  const errorMessage = sp.error
    ? decodeURIComponent(sp.error)
    : undefined;

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <EditUserForm
        userId={profile.id}
        initialFullName={profile.full_name?.trim() ?? ""}
        initialEmail={profile.email}
        initialRole={profile.role}
        initialPhone={initialPhone}
        initialCompanyName={initialCompanyName}
        initialRfc={initialRfc}
        errorMessage={errorMessage}
      />
    </main>
  );
}
