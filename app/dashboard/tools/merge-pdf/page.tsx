import Link from "next/link";
import { redirect } from "next/navigation";
import { MergePdfTool } from "@/components/tools/merge-pdf-tool";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MergePdfPage() {
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

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-medium tracking-tight text-slate-900">
          Unificar PDFs
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Combina varios archivos PDF en uno solo. El proceso se realiza en tu
          navegador; los archivos no se envían al servidor.
        </p>
      </div>

      <MergePdfTool />
    </main>
  );
}
