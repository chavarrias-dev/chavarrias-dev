"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function savePedimento(formData: FormData) {
  const numero = formData.get("numero_pedimento");
  const fecha = formData.get("fecha");
  const aduana = formData.get("aduana");
  const clienteId = formData.get("cliente_id");

  if (typeof numero !== "string" || !numero.trim()) {
    redirect("/dashboard/pedimentos/new?error=Numero%20de%20pedimento%20requerido");
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect("/dashboard/pedimentos/new?error=Fecha%20requerida");
  }
  if (typeof aduana !== "string" || !aduana.trim()) {
    redirect("/dashboard/pedimentos/new?error=Aduana%20requerida");
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect("/dashboard/pedimentos/new?error=Cliente%20requerido");
  }

  const file = formData.get("archivo");
  if (file instanceof File && file.size > 0 && file.type !== "application/pdf") {
    redirect("/dashboard/pedimentos/new?error=Solo%20se%20permiten%20archivos%20PDF");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: row, error } = await supabase
    .from("pedimentos")
    .insert({
      numero_pedimento: numero.trim(),
      fecha: fecha.trim(),
      aduana: aduana.trim(),
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
      archivo_url: null,
    })
    .select("id")
    .single();

  if (error || !row) {
    redirect(
      `/dashboard/pedimentos/new?error=${encodeURIComponent(error?.message ?? "Error al guardar")}`,
    );
  }

  if (file instanceof File && file.size > 0) {
    const path = `pedimentos/${user.id}/${row.id}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (!upErr) {
      const { data: pub } = supabase.storage
        .from(CRM_DOCUMENTS_BUCKET)
        .getPublicUrl(path);
      await supabase
        .from("pedimentos")
        .update({ archivo_url: pub.publicUrl })
        .eq("id", row.id);
    }
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "creó pedimento",
    entityType: "pedimento",
    entityId: row.id,
    entityName: numero.trim(),
  });

  redirect("/dashboard/pedimentos");
}

export async function updatePedimento(formData: FormData) {
  const pedimentoId = formData.get("pedimento_id");
  if (typeof pedimentoId !== "string" || !pedimentoId.trim()) {
    redirect("/dashboard/pedimentos?error=Identificador%20invalido");
  }
  const id = pedimentoId.trim();

  const numero = formData.get("numero_pedimento");
  const fecha = formData.get("fecha");
  const aduana = formData.get("aduana");
  const clienteId = formData.get("cliente_id");

  if (typeof numero !== "string" || !numero.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Número de pedimento requerido")}`,
    );
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Fecha requerida")}`,
    );
  }
  if (typeof aduana !== "string" || !aduana.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Aduana requerida")}`,
    );
  }
  if (typeof clienteId !== "string" || !clienteId.trim()) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Cliente requerido")}`,
    );
  }

  const file = formData.get("archivo");
  if (file instanceof File && file.size > 0 && file.type !== "application/pdf") {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent("Solo se permiten archivos PDF")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("pedimentos")
    .select("id, archivo_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    redirect("/dashboard/pedimentos?error=Pedimento%20no%20encontrado");
  }

  const { error: updErr } = await supabase
    .from("pedimentos")
    .update({
      numero_pedimento: numero.trim(),
      fecha: fecha.trim(),
      aduana: aduana.trim(),
      cliente_id: clienteId.trim(),
      notas: emptyToNull(formData.get("notas")),
    })
    .eq("id", id);

  if (updErr) {
    redirect(
      `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(updErr.message)}`,
    );
  }

  if (file instanceof File && file.size > 0) {
    const path = `pedimentos/${user.id}/${id}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      redirect(
        `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(`Error al subir el PDF: ${upErr.message}`)}`,
      );
    }
    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    const { error: urlErr } = await supabase
      .from("pedimentos")
      .update({ archivo_url: pub.publicUrl })
      .eq("id", id);
    if (urlErr) {
      redirect(
        `/dashboard/pedimentos/${id}/edit?error=${encodeURIComponent(urlErr.message)}`,
      );
    }
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó pedimento",
    entityType: "pedimento",
    entityId: id,
    entityName: numero.trim(),
  });

  redirect("/dashboard/pedimentos");
}

export async function deletePedimento(formData: FormData) {
  const raw = formData.get("pedimento_id");
  if (typeof raw !== "string" || !raw.trim()) {
    redirect("/dashboard/pedimentos?error=Identificador%20invalido");
  }
  const id = raw.trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: row, error: fetchErr } = await supabase
    .from("pedimentos")
    .select("id, archivo_url, numero_pedimento")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    redirect("/dashboard/pedimentos?error=Pedimento%20no%20encontrado");
  }

  const numeroLabel =
    (row as { numero_pedimento?: string }).numero_pedimento?.trim() ?? id;

  if (row.archivo_url) {
    const path = `pedimentos/${user.id}/${id}.pdf`;
    await supabase.storage.from(CRM_DOCUMENTS_BUCKET).remove([path]);
  }

  const { error: delErr } = await supabase.from("pedimentos").delete().eq("id", id);

  if (delErr) {
    redirect(
      `/dashboard/pedimentos?error=${encodeURIComponent(delErr.message)}`,
    );
  }

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "eliminó pedimento",
    entityType: "pedimento",
    entityId: id,
    entityName: numeroLabel,
  });

  redirect("/dashboard/pedimentos");
}
