import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WhatsAppPanel } from "@/components/whatsapp/whatsapp-panel";
import type { WhatsAppMessageRecord } from "@/lib/whatsapp";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const WHATSAPP_MESSAGE_SELECT =
  "id, wa_message_id, from_number, to_number, message, direction, status, client_id, created_at";

export default async function WhatsAppPage() {
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

  const [{ data: messageRows }, { data: clientRows }] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select(WHATSAPP_MESSAGE_SELECT)
      .order("created_at", { ascending: true })
      .limit(2000),
    supabase.from("clients").select("id, full_name, phone"),
  ]);

  const initialMessages = (messageRows ?? []) as WhatsAppMessageRecord[];
  const clients = (clientRows ?? []) as {
    id: string;
    full_name: string;
    phone: string | null;
  }[];

  return (
    <main className="font-poppins w-full flex-1 px-4 py-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-8.5rem)] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            Cargando conversaciones…
          </div>
        }
      >
        <WhatsAppPanel initialMessages={initialMessages} clients={clients} />
      </Suspense>
    </main>
  );
}
