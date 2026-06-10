"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CRM_DOCUMENTS_BUCKET,
  storageObjectPathFromPublicUrl,
} from "@/lib/supabase-storage";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

async function requireStaff() {
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
  return { supabase, user };
}

export async function updateClient(formData: FormData) {
  const { supabase, user } = await requireStaff();

  const rawId = formData.get("client_id");
  if (typeof rawId !== "string" || !rawId.trim()) {
    redirect("/dashboard/clients?error=Identificador%20invalido");
  }
  const clientId = rawId.trim();

  const fullName = formData.get("full_name");
  const email = formData.get("email");

  if (typeof fullName !== "string" || !fullName.trim()) {
    redirect(
      `/dashboard/clients/${clientId}/edit?error=${encodeURIComponent("Nombre requerido")}`,
    );
  }
  if (typeof email !== "string" || !email.trim()) {
    redirect(
      `/dashboard/clients/${clientId}/edit?error=${encodeURIComponent("Correo requerido")}`,
    );
  }

  const { error } = await supabase
    .from("clients")
    .update({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: emptyToNull(formData.get("phone")),
      company_name: emptyToNull(formData.get("company_name")),
      rfc: emptyToNull(formData.get("rfc")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", clientId);

  if (error) {
    redirect(
      `/dashboard/clients/${clientId}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó cliente",
    entityType: "cliente",
    entityId: clientId,
    entityName: fullName.trim(),
  });

  redirect("/dashboard/clients");
}

export async function deleteClient(formData: FormData) {
  const { supabase, user } = await requireStaff();

  const rawId = formData.get("client_id");
  if (typeof rawId !== "string" || !rawId.trim()) {
    redirect("/dashboard/clients?error=Identificador%20invalido");
  }
  const clientId = rawId.trim();

  const admin = createSupabaseAdminClient();

  const { data: clientRow, error: clientFetchErr } = await admin
    .from("clients")
    .select("full_name, constancia_url")
    .eq("id", clientId)
    .maybeSingle();

  if (clientFetchErr || !clientRow) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(clientFetchErr?.message ?? "Cliente no encontrado")}`,
    );
  }

  const displayName =
    (clientRow as { full_name?: string }).full_name?.trim() ?? clientId;

  const constanciaUrl =
    (clientRow as { constancia_url?: string | null }).constancia_url ?? null;

  const { data: facturasRows } = await admin
    .from("facturas")
    .select("archivo_url")
    .eq("cliente_id", clientId);

  const { data: pedimentosRows } = await admin
    .from("pedimentos")
    .select("archivo_url")
    .eq("cliente_id", clientId);

  const { data: documentsRows } = await admin
    .from("client_documents")
    .select("archivo_url")
    .eq("client_id", clientId);

  const pathsToRemove = new Set<string>();

  for (const row of facturasRows ?? []) {
    const url = (row as { archivo_url?: string | null }).archivo_url;
    if (typeof url === "string" && url.trim()) {
      const p = storageObjectPathFromPublicUrl(url);
      if (p) pathsToRemove.add(p);
    }
  }

  for (const row of pedimentosRows ?? []) {
    const url = (row as { archivo_url?: string | null }).archivo_url;
    if (typeof url === "string" && url.trim()) {
      const p = storageObjectPathFromPublicUrl(url);
      if (p) pathsToRemove.add(p);
    }
  }

  for (const row of documentsRows ?? []) {
    const url = (row as { archivo_url?: string | null }).archivo_url;
    if (typeof url === "string" && url.trim()) {
      const p = storageObjectPathFromPublicUrl(url);
      if (p) pathsToRemove.add(p);
    }
  }

  if (constanciaUrl?.trim()) {
    const fromUrl = storageObjectPathFromPublicUrl(constanciaUrl);
    if (fromUrl) {
      pathsToRemove.add(fromUrl);
    } else {
      pathsToRemove.add(`constancias/${clientId}.pdf`);
    }
  }

  const paths = [...pathsToRemove];
  if (paths.length > 0) {
    await admin.storage.from(CRM_DOCUMENTS_BUCKET).remove(paths);
  }

  const { error: facturasDelErr } = await admin
    .from("facturas")
    .delete()
    .eq("cliente_id", clientId);

  if (facturasDelErr) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(facturasDelErr.message)}`,
    );
  }

  const { error: pedimentosDelErr } = await admin
    .from("pedimentos")
    .delete()
    .eq("cliente_id", clientId);

  if (pedimentosDelErr) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(pedimentosDelErr.message)}`,
    );
  }

  const { error: documentsDelErr } = await admin
    .from("client_documents")
    .delete()
    .eq("client_id", clientId);

  if (documentsDelErr) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(documentsDelErr.message)}`,
    );
  }

  const { error } = await admin.from("clients").delete().eq("id", clientId);

  if (error) {
    redirect(
      `/dashboard/clients?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó cliente",
    entityType: "cliente",
    entityId: clientId,
    entityName: displayName,
  });

  redirect("/dashboard/clients");
}
