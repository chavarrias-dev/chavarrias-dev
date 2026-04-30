import Link from "next/link";
import { NewFacturaForm } from "@/components/facturas/new-factura-form";
import type { ClientOption } from "@/components/clients/types";
import { getUserRole } from "@/lib/supabase/middleware";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ error?: string; cliente_id?: string }>;
};

export default async function NewFacturaPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(supabase, user.id) : null;
  const isAdmin = role === "admin";

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  const clients = (clientRows ?? []) as ClientOption[];
  const params = await searchParams;
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : undefined;
  const defaultClienteId = params.cliente_id?.trim() || undefined;

  if (clients.length === 0) {
    return (
      <main className="w-full flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200/90 bg-amber-50/80 px-5 py-8 text-center">
          <p className="text-sm text-amber-950">
            Necesitas al menos un cliente para crear una factura.
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

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <NewFacturaForm
        clients={clients}
        errorMessage={errorMessage}
        defaultClienteId={defaultClienteId}
      />
    </main>
  );
}
