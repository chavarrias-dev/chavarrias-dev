"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity-log";
import {
  calculateDocumentStatus,
  recalculateDocumentStatuses,
} from "@/lib/document-status";
import {
  calculateExpirationFromPeriod,
  documentStoragePath,
  isDocumentType,
  isValidityPeriod,
  type ValidityPeriod,
} from "@/lib/documents-config";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function getFormString(formData: FormData, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseBooleanField(value: FormDataEntryValue | null): boolean {
  if (value === "true" || value === "on") {
    return true;
  }
  return false;
}

function normalizeValidityPeriod(raw: string | null): ValidityPeriod {
  if (!raw) {
    return "indefinido";
  }
  const normalized = raw === "1_año" ? "1_anio" : raw;
  if (isValidityPeriod(normalized)) {
    return normalized;
  }
  return "indefinido";
}

function parseExpirationFromForm(
  formData: FormData,
  fechaSubida: Date,
): {
  fechaVencimiento: string | null;
  sinVencimiento: boolean;
  validoManualmente: boolean;
} {
  const validoPor = normalizeValidityPeriod(
    getFormString(formData, "validityPeriod", "valido_por"),
  );

  const sinVencimiento = validoPor === "indefinido";

  const validoManualmente = parseBooleanField(
    formData.get("validoManualmente") ?? formData.get("valido_manualmente"),
  );

  let fechaVencimiento: string | null = null;

  if (validoPor === "indefinido") {
    fechaVencimiento = null;
  } else if (validoPor === "fecha_especifica") {
    fechaVencimiento =
      emptyToNull(formData.get("fechaEspecifica")) ??
      emptyToNull(formData.get("fecha_vencimiento_resolved")) ??
      emptyToNull(formData.get("fecha_vencimiento"));
  } else {
    fechaVencimiento = calculateExpirationFromPeriod(fechaSubida, validoPor);
  }

  return { fechaVencimiento, sinVencimiento, validoManualmente };
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

async function requireStaffOrOwnClient(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const role = await getUserRole(supabase, user.id);
  if (role === "admin" || role === "empleado") {
    return { supabase, user };
  }
  if (role === "cliente") {
    const email = user.email?.trim();
    if (!email) {
      redirect("/dashboard");
    }
    const { data: ownRow } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const ownClientId = (ownRow as { id: string } | null)?.id;
    if (!ownClientId || ownClientId !== clientId) {
      redirect("/dashboard");
    }
    return { supabase, user };
  }
  redirect("/dashboard");
}

function buildRedirectUrl(
  clientId: string,
  documentType: string,
  error: string,
  mode: "upload" | "edit",
  docId?: string,
): string {
  if (mode === "edit" && docId) {
    return `/dashboard/clients/${clientId}/documents/${docId}/edit?error=${encodeURIComponent(error)}`;
  }
  return `/dashboard/clients/${clientId}/documents/upload?tipo=${encodeURIComponent(documentType)}&error=${encodeURIComponent(error)}`;
}

export type UploadDocumentResult =
  | { ok: true }
  | { ok: false; error: string };

type ExistingDocumentRow = {
  id: string;
  archivo_url: string | null;
  fecha_vencimiento: string | null;
  fecha_subida: string | null;
  sin_vencimiento: boolean | null;
  valido_manualmente: boolean | null;
  notas: string | null;
};

async function fetchExistingDocument(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  clientId: string,
  documentType: string,
): Promise<ExistingDocumentRow | null> {
  const { data } = await supabase
    .from("client_documents")
    .select(
      "id, archivo_url, fecha_vencimiento, fecha_subida, sin_vencimiento, valido_manualmente, notas",
    )
    .eq("client_id", clientId)
    .eq("document_type", documentType)
    .maybeSingle();

  return (data as ExistingDocumentRow | null) ?? null;
}

export async function quickUploadClientDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  const clientId = getFormString(formData, "clientId", "client_id");
  if (!clientId) {
    return { ok: false, error: "Cliente requerido" };
  }

  const { supabase, user } = await requireStaffOrOwnClient(clientId);

  const documentType = getFormString(formData, "documentType", "document_type");
  if (!documentType || !isDocumentType(documentType)) {
    return { ok: false, error: "Tipo de documento inválido" };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Debes seleccionar un archivo PDF" };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Solo se permiten archivos PDF" };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!clientRow) {
    return { ok: false, error: "Cliente no encontrado" };
  }

  const existing = await fetchExistingDocument(supabase, clientId, documentType);
  const fechaSubida = new Date();

  const path = documentStoragePath(clientId, documentType);
  const { error: upErr } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    return { ok: false, error: `Error al subir el PDF: ${upErr.message}` };
  }

  const { data: pub } = supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(path);
  const archivoUrl = pub.publicUrl;

  const expiration = existing
    ? {
        fechaVencimiento: existing.fecha_vencimiento,
        sinVencimiento: existing.sin_vencimiento ?? false,
        validoManualmente: existing.valido_manualmente ?? true,
      }
    : {
        fechaVencimiento: null as string | null,
        sinVencimiento: true,
        validoManualmente: true,
      };

  const status = calculateDocumentStatus(archivoUrl, expiration);

  const payload = {
    client_id: clientId,
    document_type: documentType,
    archivo_url: archivoUrl,
    fecha_vencimiento: expiration.fechaVencimiento,
    fecha_subida: fechaSubida.toISOString(),
    subido_por: user.id,
    notas: existing?.notas ?? null,
    sin_vencimiento: expiration.sinVencimiento,
    valido_manualmente: expiration.validoManualmente,
    status,
  };

  if (existing) {
    const { error: updErr } = await supabase
      .from("client_documents")
      .update(payload)
      .eq("id", existing.id);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }
  } else {
    const { error: insErr } = await supabase
      .from("client_documents")
      .insert(payload);

    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  await recalculateDocumentStatuses(supabase);

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: existing ? "actualizó documento" : "subió documento",
    entityType: "documento",
    entityId: clientId,
    entityName: `${documentType} — ${(clientRow as { full_name: string }).full_name}`,
  });

  return { ok: true };
}

export async function configureClientDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  const { supabase, user } = await requireStaff();

  const clientId = getFormString(formData, "clientId", "client_id");
  const documentType = getFormString(formData, "documentType", "document_type");

  if (!clientId) {
    return { ok: false, error: "Cliente requerido" };
  }
  if (!documentType || !isDocumentType(documentType)) {
    return { ok: false, error: "Tipo de documento inválido" };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!clientRow) {
    return { ok: false, error: "Cliente no encontrado" };
  }

  const existing = await fetchExistingDocument(supabase, clientId, documentType);
  const fechaSubidaRaw = existing?.fecha_subida;
  const fechaSubida = fechaSubidaRaw ? new Date(fechaSubidaRaw) : new Date();
  const expiration = parseExpirationFromForm(formData, fechaSubida);
  const notas = emptyToNull(formData.get("notas"));

  let archivoUrl = existing?.archivo_url ?? null;

  const file = formData.get("archivo");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      return { ok: false, error: "Solo se permiten archivos PDF" };
    }

    const path = documentStoragePath(clientId, documentType);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      return { ok: false, error: `Error al subir el PDF: ${upErr.message}` };
    }

    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    archivoUrl = pub.publicUrl;
  }

  const status = calculateDocumentStatus(archivoUrl, expiration);

  const payload = {
    client_id: clientId,
    document_type: documentType,
    archivo_url: archivoUrl,
    fecha_vencimiento: expiration.fechaVencimiento,
    fecha_subida: existing?.fecha_subida ?? new Date().toISOString(),
    subido_por: user.id,
    notas,
    sin_vencimiento: expiration.sinVencimiento,
    valido_manualmente: expiration.validoManualmente,
    status,
  };

  if (existing) {
    const { error: updErr } = await supabase
      .from("client_documents")
      .update(payload)
      .eq("id", existing.id);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }
  } else {
    const { error: insErr } = await supabase
      .from("client_documents")
      .insert(payload);

    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  await recalculateDocumentStatuses(supabase);

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "configuró documento",
    entityType: "documento",
    entityId: clientId,
    entityName: `${documentType} — ${(clientRow as { full_name: string }).full_name}`,
  });

  return { ok: true };
}

export async function uploadClientDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  const { supabase, user } = await requireStaff();

  const clientId = getFormString(formData, "clientId", "client_id");
  const documentType = getFormString(formData, "documentType", "document_type");

  if (!clientId) {
    return { ok: false, error: "Cliente requerido" };
  }
  if (!documentType || !isDocumentType(documentType)) {
    return { ok: false, error: "Tipo de documento inválido" };
  }

  const trimmedClientId = clientId;

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Debes seleccionar un archivo PDF" };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Solo se permiten archivos PDF" };
  }

  const notas = emptyToNull(formData.get("notas"));
  const fechaSubida = new Date();
  const expiration = parseExpirationFromForm(formData, fechaSubida);

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("id", trimmedClientId)
    .maybeSingle();

  if (!clientRow) {
    return { ok: false, error: "Cliente no encontrado" };
  }

  const path = documentStoragePath(trimmedClientId, documentType);
  const { error: upErr } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    return { ok: false, error: `Error al subir el PDF: ${upErr.message}` };
  }

  const { data: pub } = supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .getPublicUrl(path);
  const archivoUrl = pub.publicUrl;
  const status = calculateDocumentStatus(archivoUrl, expiration);

  const { data: existing } = await supabase
    .from("client_documents")
    .select("id")
    .eq("client_id", trimmedClientId)
    .eq("document_type", documentType)
    .maybeSingle();

  const payload = {
    client_id: trimmedClientId,
    document_type: documentType,
    archivo_url: archivoUrl,
    fecha_vencimiento: expiration.fechaVencimiento,
    fecha_subida: fechaSubida.toISOString(),
    subido_por: user.id,
    notas,
    sin_vencimiento: expiration.sinVencimiento,
    valido_manualmente: expiration.validoManualmente,
    status,
  };

  if (existing) {
    const { error: updErr } = await supabase
      .from("client_documents")
      .update(payload)
      .eq("id", (existing as { id: string }).id);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }
  } else {
    const { error: insErr } = await supabase
      .from("client_documents")
      .insert(payload);

    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  await recalculateDocumentStatuses(supabase);

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: existing ? "actualizó documento" : "subió documento",
    entityType: "documento",
    entityId: trimmedClientId,
    entityName: `${documentType} — ${(clientRow as { full_name: string }).full_name}`,
  });

  return { ok: true };
}

export async function updateClientDocument(formData: FormData) {
  const { supabase, user } = await requireStaff();

  const clientId = getFormString(formData, "clientId", "client_id");
  const docId = getFormString(formData, "document_id");

  if (!clientId) {
    redirect("/dashboard/clients?error=Cliente%20requerido");
  }
  if (!docId) {
    redirect(`/dashboard/clients/${clientId}?error=Documento%20invalido`);
  }

  const trimmedClientId = clientId;
  const trimmedDocId = docId;

  const { data: existingDoc, error: fetchErr } = await supabase
    .from("client_documents")
    .select(
      "id, client_id, document_type, archivo_url, fecha_subida, notas",
    )
    .eq("id", trimmedDocId)
    .eq("client_id", trimmedClientId)
    .maybeSingle();

  if (fetchErr || !existingDoc) {
    redirect(
      `/dashboard/clients/${trimmedClientId}?error=${encodeURIComponent("Documento no encontrado")}`,
    );
  }

  const documentType = (existingDoc as { document_type: string }).document_type;
  const notas = emptyToNull(formData.get("notas"));
  const fechaSubidaRaw = (existingDoc as { fecha_subida: string | null })
    .fecha_subida;
  const fechaSubida = fechaSubidaRaw ? new Date(fechaSubidaRaw) : new Date();
  const expiration = parseExpirationFromForm(formData, fechaSubida);

  let archivoUrl = (existingDoc as { archivo_url: string | null }).archivo_url;

  const file = formData.get("archivo");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      redirect(
        buildRedirectUrl(
          trimmedClientId,
          documentType,
          "Solo se permiten archivos PDF",
          "edit",
          trimmedDocId,
        ),
      );
    }

    const path = documentStoragePath(trimmedClientId, documentType);
    const { error: upErr } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      redirect(
        buildRedirectUrl(
          trimmedClientId,
          documentType,
          `Error al subir el PDF: ${upErr.message}`,
          "edit",
          trimmedDocId,
        ),
      );
    }

    const { data: pub } = supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .getPublicUrl(path);
    archivoUrl = pub.publicUrl;
  }

  const status = calculateDocumentStatus(archivoUrl, expiration);

  const { error: updErr } = await supabase
    .from("client_documents")
    .update({
      archivo_url: archivoUrl,
      fecha_vencimiento: expiration.fechaVencimiento,
      notas,
      sin_vencimiento: expiration.sinVencimiento,
      valido_manualmente: expiration.validoManualmente,
      status,
    })
    .eq("id", trimmedDocId);

  if (updErr) {
    redirect(
      buildRedirectUrl(
        trimmedClientId,
        documentType,
        updErr.message,
        "edit",
        trimmedDocId,
      ),
    );
  }

  await recalculateDocumentStatuses(supabase);

  const { data: clientRow } = await supabase
    .from("clients")
    .select("full_name")
    .eq("id", trimmedClientId)
    .maybeSingle();

  await logActivity(supabase, {
    userId: user.id,
    userEmail: user.email ?? "",
    action: "editó vigencia de documento",
    entityType: "documento",
    entityId: trimmedDocId,
    entityName: `${documentType} — ${(clientRow as { full_name?: string } | null)?.full_name ?? trimmedClientId}`,
  });

  redirect(`/dashboard/clients/${trimmedClientId}`);
}

export async function refreshDocumentStatuses() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  await recalculateDocumentStatuses(supabase);
}
