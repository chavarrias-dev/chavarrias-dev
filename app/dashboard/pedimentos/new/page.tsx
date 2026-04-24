import Link from "next/link";
import type { ClientOption } from "@/components/clients/types";
import { NewPedimentoForm } from "@/components/pedimentos/new-pedimento-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewPedimentoPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  const clients = (clientRows ?? []) as ClientOption[];
  const params = await searchParams;
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : undefined;

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <NewPedimentoForm clients={clients} errorMessage={errorMessage} />
    </main>
  );
}
