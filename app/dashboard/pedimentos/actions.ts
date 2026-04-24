"use server";

import { redirect } from "next/navigation";
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
  const clienteIdRaw = formData.get("cliente_id");

  if (typeof numero !== "string" || !numero.trim()) {
    redirect("/dashboard/pedimentos/new?error=Numero%20de%20pedimento%20requerido");
  }
  if (typeof fecha !== "string" || !fecha.trim()) {
    redirect("/dashboard/pedimentos/new?error=Fecha%20requerida");
  }
  if (typeof aduana !== "string" || !aduana.trim()) {
    redirect("/dashboard/pedimentos/new?error=Aduana%20requerida");
  }

  const clienteId =
    typeof clienteIdRaw === "string" && clienteIdRaw.trim()
      ? clienteIdRaw.trim()
      : null;

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
      cliente_id: clienteId,
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

  redirect("/dashboard/pedimentos");
}
