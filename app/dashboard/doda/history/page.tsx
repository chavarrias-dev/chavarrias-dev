import { redirect } from "next/navigation";
import { DodaHistoryTable } from "@/components/dodas/doda-history-table";
import { fetchResolvedDodaHistory } from "@/lib/doda-dashboard-data";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DodaHistoryPage() {
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

  const dodas = await fetchResolvedDodaHistory(supabase);

  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">
          Historial de resultados
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Todos los DODAs con desaduanamiento confirmado.
        </p>
      </div>

      <DodaHistoryTable dodas={dodas} />
    </main>
  );
}
