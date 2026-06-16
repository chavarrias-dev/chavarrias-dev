import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MessagesPanel } from "@/components/messages/messages-panel";
import { type MessageProfile, type MessageRecord, INTERNAL_COMPANY_NAME } from "@/lib/messages";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);

  const [{ data: messageRows }, { data: profileRows }, { data: clientRows }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, read, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name", { ascending: true }),
      supabase.from("clients").select("email, company_name"),
    ]);

  const companyByEmail = new Map(
    (
      (clientRows ?? []) as {
        email: string;
        company_name: string | null;
      }[]
    ).map((client) => [
      client.email.trim().toLowerCase(),
      client.company_name?.trim() || null,
    ]),
  );

  const allProfiles: MessageProfile[] = (
    (profileRows ?? []) as Omit<MessageProfile, "companyName">[]
  ).map((profile) => {
    const isInternal =
      profile.role === "admin" || profile.role === "empleado";

    return {
      ...profile,
      companyName: isInternal
        ? INTERNAL_COMPANY_NAME
        : companyByEmail.get(profile.email.trim().toLowerCase()) ?? null,
    };
  });

  const initialMessages = (messageRows ?? []) as MessageRecord[];

  return (
    <main className="font-poppins w-full flex-1 px-4 py-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-8.5rem)] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            Cargando mensajes…
          </div>
        }
      >
        <MessagesPanel
          currentUserId={user.id}
          currentUserRole={role}
          initialMessages={initialMessages}
          allProfiles={allProfiles}
        />
      </Suspense>
    </main>
  );
}
