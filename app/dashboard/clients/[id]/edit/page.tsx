import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditClientForm } from "@/components/clients/edit-client-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/middleware";

type ClientRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  rfc: string | null;
  notes: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditClientPage({ params, searchParams }: PageProps) {
  const { id } = await params;

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

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, company_name, rfc, notes")
    .eq("id", id)
    .maybeSingle();

  if (error || !client) {
    notFound();
  }

  const sp = await searchParams;
  const errorMessage = sp.error
    ? decodeURIComponent(sp.error)
    : undefined;

  const c = client as ClientRecord;

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <EditClientForm
        client={{
          id: c.id,
          full_name: c.full_name,
          email: c.email,
          phone: c.phone,
          company_name: c.company_name,
          rfc: c.rfc,
          notes: c.notes,
        }}
        errorMessage={errorMessage}
      />
      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-slate-500">
        <Link
          href="/dashboard/clients"
          className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
        >
          Volver a clientes
        </Link>
      </p>
    </main>
  );
}
