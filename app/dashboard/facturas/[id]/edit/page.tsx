import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ClientOption } from "@/components/clients/types";
import { EditFacturaForm } from "@/components/facturas/edit-factura-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FacturaRecord = {
  id: string;
  numero_factura: string;
  fecha: string;
  monto: string;
  cliente_id: string;
  archivo_url: string | null;
  notas: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
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

  const { data: factura, error } = await supabase
    .from("facturas")
    .select(
      "id, numero_factura, fecha, monto, cliente_id, archivo_url, notas",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !factura) {
    notFound();
  }

  const f = factura as FacturaRecord;

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  let clients = (clientRows ?? []) as ClientOption[];
  if (!clients.some((c) => c.id === f.cliente_id)) {
    const { data: linked } = await supabase
      .from("clients")
      .select("id, full_name")
      .eq("id", f.cliente_id)
      .maybeSingle();
    if (linked) {
      clients = [linked as ClientOption, ...clients];
    }
  }

  if (clients.length === 0) {
    return (
      <main className="w-full flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200/90 bg-amber-50/80 px-5 py-8 text-center">
          <p className="text-sm text-amber-950">
            Necesitas al menos un cliente asignado.
          </p>
          <Link
            href="/dashboard/clients/new"
            className="mt-4 inline-flex text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
          >
            Agregar cliente
          </Link>
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const errorMessage = sp.error
    ? decodeURIComponent(sp.error)
    : undefined;

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <EditFacturaForm
        factura={{
          id: f.id,
          cliente_id: f.cliente_id,
          numero_factura: f.numero_factura,
          fecha: f.fecha,
          monto: String(f.monto),
          notas: f.notas,
          archivo_url: f.archivo_url,
        }}
        clients={clients}
        errorMessage={errorMessage}
      />
    </main>
  );
}
