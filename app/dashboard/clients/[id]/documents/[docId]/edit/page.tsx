import { notFound, redirect } from "next/navigation";
import { EditDocumentForm } from "@/components/documents/edit-document-form";
import type { DocumentType } from "@/lib/documents-config";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string; docId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditClientDocumentPage({
  params,
  searchParams,
}: PageProps) {
  const { id: clientId, docId } = await params;
  const { error } = await searchParams;

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

  const [{ data: clientRow, error: clientErr }, { data: docRow, error: docErr }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name")
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("client_documents")
        .select(
          "id, document_type, archivo_url, fecha_subida, fecha_vencimiento, sin_vencimiento, valido_manualmente, notas",
        )
        .eq("id", docId)
        .eq("client_id", clientId)
        .maybeSingle(),
    ]);

  if (clientErr || !clientRow || docErr || !docRow) {
    notFound();
  }

  const doc = docRow as {
    id: string;
    document_type: string;
    archivo_url: string | null;
    fecha_subida: string | null;
    fecha_vencimiento: string | null;
    sin_vencimiento: boolean | null;
    valido_manualmente: boolean | null;
    notas: string | null;
  };

  const errorMessage = error ? decodeURIComponent(error) : undefined;

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <EditDocumentForm
        clientId={clientId}
        clientName={(clientRow as { full_name: string }).full_name}
        documentId={doc.id}
        documentType={doc.document_type as DocumentType}
        archivoUrl={doc.archivo_url}
        fechaSubida={doc.fecha_subida}
        fechaVencimiento={doc.fecha_vencimiento}
        sinVencimiento={doc.sin_vencimiento ?? false}
        validoManualmente={doc.valido_manualmente ?? true}
        notas={doc.notas}
        errorMessage={errorMessage}
      />
    </main>
  );
}
