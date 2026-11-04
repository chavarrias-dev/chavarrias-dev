import { redirect } from "next/navigation";
import { ClientEstadoDeCuentaLink } from "@/components/clients/client-estado-de-cuenta-link";
import { EstadosDeCuentaStaffView } from "@/components/clients/estados-de-cuenta-staff-view";
import {
  fetchClientByIdWithSpreadsheetFallback,
  listClientsForEstadoDeCuenta,
} from "@/lib/client-google-spreadsheet-db";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DASHBOARD_PAGE_MAIN_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboard-layout";

export default async function EstadosDeCuentaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  const isStaff = role === "admin" || role === "empleado";

  if (isStaff) {
    const { data: clients, error } = await listClientsForEstadoDeCuenta(supabase);

    return (
      <main className={DASHBOARD_PAGE_MAIN_CLASS}>
        <div className="mb-6 sm:mb-8">
          <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Estados de cuenta</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Hojas de Google Sheets vinculadas por cliente. Vincula o cambia el
            enlace desde el perfil de cada cliente.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No se pudo cargar la lista: {error}
          </p>
        ) : null}

        <EstadosDeCuentaStaffView clients={clients} />
      </main>
    );
  }

  if (role !== "cliente") {
    redirect("/dashboard");
  }

  const email = user.email?.trim();
  if (!email) {
    redirect("/dashboard");
  }

  const { data: ownRow } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const ownClientId = (ownRow as { id: string } | null)?.id;
  if (!ownClientId) {
    redirect("/dashboard");
  }

  const { data: client, error: clientError } =
    await fetchClientByIdWithSpreadsheetFallback<{
      full_name: string;
      google_spreadsheet_url: string | null;
    }>(
      supabase,
      ownClientId,
      "full_name, google_spreadsheet_url",
      "full_name",
    );

  if (clientError) {
    throw new Error(clientError);
  }

  const sheetUrl = client?.google_spreadsheet_url ?? null;

  return (
    <main className={DASHBOARD_PAGE_MAIN_CLASS}>
      <div className="mb-6 sm:mb-8">
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Estados de cuenta</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Consulta tu estado de cuenta actualizado por Chavarrias.
        </p>
      </div>

      <ClientEstadoDeCuentaLink
        spreadsheetUrl={sheetUrl}
        showInlinePreview={Boolean(sheetUrl)}
        previewTitle={`Estado de cuenta — ${client?.full_name ?? "Cliente"}`}
      />
    </main>
  );
}
