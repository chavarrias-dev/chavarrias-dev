import { redirect } from "next/navigation";
import { DocumentAlerts } from "@/components/dashboard/document-alerts";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "./actions";

type ProfileRow = {
  full_name: string | null;
  email: string;
  role: string | null;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  const isStaff = role === "admin" || role === "empleado";
  const isAdmin = role === "admin";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const userName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "Usuario";
  const userEmail = profile?.email ?? user.email ?? "";
  const userRole = profile?.role ?? role ?? "user";

  let dbConnected: boolean | undefined;
  if (isAdmin) {
    const { error: profilesPingError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    dbConnected = !profilesPingError;
  }

  return (
    <DashboardShell
      userName={userName}
      userEmail={userEmail}
      role={userRole}
      isStaff={isStaff}
      isAdmin={isAdmin}
      dbConnected={dbConnected}
      currentUserId={user.id}
      logoutAction={logout}
      alerts={<DocumentAlerts />}
    >
      {children}
    </DashboardShell>
  );
}
