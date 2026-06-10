import { notFound, redirect } from "next/navigation";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { isDocumentType } from "@/lib/documents-config";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; error?: string }>;
};

export default async function UploadClientDocumentPage({
  params,
  searchParams,
}: PageProps) {
  const { id: clientId } = await params;
  const { tipo, error } = await searchParams;

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

  if (!tipo || !isDocumentType(tipo)) {
    redirect(`/dashboard/clients/${clientId}`);
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("id", clientId)
    .maybeSingle();

  if (clientErr || !clientRow) {
    notFound();
  }

  const errorMessage = error ? decodeURIComponent(error) : undefined;

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <UploadDocumentForm
        clientId={clientId}
        clientName={(clientRow as { full_name: string }).full_name}
        documentType={tipo}
        errorMessage={errorMessage}
      />
    </main>
  );
}
