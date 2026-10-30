import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ClientOption } from "@/components/clients/types";
import { EditFacturaForm } from "@/components/facturas/edit-factura-form";
import {
  applyFacturaEmailBodyTemplate,
  buildFacturaEmailTemplateVars,
} from "@/lib/factura-email-template-defaults";
import {
  loadFacturaEmailTemplateSettings,
} from "@/lib/factura-email-settings";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FacturaRecord = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  cliente_id: string;
  archivo_url: string | null;
  notas: string | null;
  correos_adicionales: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; aviso?: string }>;
};

export default async function EditFacturaPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const authRole = await getUserRole(supabase, user.id);
  const isAdmin = authRole === "admin";

  if (authRole !== "admin" && authRole !== "empleado") {
    redirect("/dashboard");
  }

  const { data: factura, error } = await supabase
    .from("facturas")
    .select(
      "id, numero_factura, fecha, monto, cliente_id, archivo_url, notas, correos_adicionales",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !factura) {
    notFound();
  }

  const f = factura as FacturaRecord;

  const [{ data: clientRows }, { data: linkedClient }, emailTemplateSettings] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, email, company_name, tipo_razon_social")
        .order("full_name", { ascending: true }),
      supabase
        .from("clients")
        .select("full_name, company_name, tipo_razon_social")
        .eq("id", f.cliente_id)
        .maybeSingle(),
      loadFacturaEmailTemplateSettings(supabase),
    ]);

  let clients = (clientRows ?? []) as ClientOption[];
  if (!clients.some((c) => c.id === f.cliente_id)) {
    const { data: linked } = await supabase
      .from("clients")
      .select("id, full_name, email")
      .eq("id", f.cliente_id)
      .maybeSingle();
    if (linked) {
      clients = [linked as ClientOption, ...clients];
    }
  }

  if (clients.length === 0) {
    return (
      <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200/90 bg-amber-50/80 px-5 py-8 text-center">
          <p className="text-sm text-amber-950">
            Necesitas al menos un cliente asignado.
          </p>
          {isAdmin ? (
            <Link
              href="/dashboard/users/new"
              className="mt-4 inline-flex text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
            >
              Registrar usuario cliente
            </Link>
          ) : (
            <span className="mt-4 block text-sm text-slate-600">
              Pide a un administrador que registre clientes en el sistema.
            </span>
          )}
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const errorMessage = sp.error
    ? decodeURIComponent(sp.error)
    : undefined;

  const noticeMessage = sp.ok?.trim() || sp.aviso?.trim() || undefined;
  const noticeError = Boolean(sp.aviso?.trim() && !sp.ok?.trim());

  let emailBodyForForm = f.notas?.trim() ?? "";
  if (!emailBodyForForm) {
    const client = linkedClient as {
      full_name?: string | null;
      company_name?: string | null;
      tipo_razon_social?: string | null;
    } | null;
    const vars = buildFacturaEmailTemplateVars({
      recipientName: client?.full_name?.trim() ?? "Cliente",
      companyName: client?.company_name,
      tipoRazonSocial: client?.tipo_razon_social,
      numeroFactura: f.numero_factura,
      fechaIso: f.fecha,
      monto: String(f.monto),
    });
    emailBodyForForm = applyFacturaEmailBodyTemplate(
      emailTemplateSettings.bodyTemplate,
      vars,
    );
  }

  return (
    <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
      <EditFacturaForm
        factura={{
          id: f.id,
          cliente_id: f.cliente_id,
          numero_factura: f.numero_factura,
          fecha: f.fecha,
          monto: String(f.monto),
          notas: emailBodyForForm,
          correos_adicionales: f.correos_adicionales,
          archivo_url: f.archivo_url,
        }}
        clients={clients}
        errorMessage={errorMessage}
        noticeMessage={noticeMessage}
        noticeError={noticeError}
      />
    </main>
  );
}
