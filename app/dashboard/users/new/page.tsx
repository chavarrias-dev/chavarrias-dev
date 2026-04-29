import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewUserForm } from "./new-user-form";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewUserPage({ searchParams }: PageProps) {
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

  const params = await searchParams;
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : undefined;

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <NewUserForm errorMessage={errorMessage} />
    </main>
  );
}
