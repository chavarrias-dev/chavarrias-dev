"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X, Download } from "lucide-react";
import { DASHBOARD_TABLE_SCROLL_CLASS } from "@/lib/dashboard-layout";
import type { WhatsappGroupOption } from "@/components/dodas/doda-notify-destination-dialog";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

async function parseJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Respuesta inválida del servidor"
        : `Error (${response.status})`,
    );
  }
}

/** Alineado con `normalizeWhatsappGroupIdForStorage` (cliente). */
function normalizeGroupIdForMatch(raw: string): string {
  return raw.trim().replace(/@g\.us$/i, "").trim();
}

type EvolutionRemoteGroup = {
  id: string;
  subject: string;
};

export function WhatsappGroupsSettingsSection() {
  const [rows, setRows] = useState<WhatsappGroupOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroupId, setNewGroupId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignSource, setReassignSource] =
    useState<WhatsappGroupOption | null>(null);
  const [reassignPending, setReassignPending] = useState<
    Array<{ id: string; numero_integracion: string | null }>
  >([]);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteGroups, setRemoteGroups] = useState<EvolutionRemoteGroup[]>([]);
  /** IDs normalizados (dígitos) de grupos remotos seleccionados para importar. */
  const [importSelectedNormalized, setImportSelectedNormalized] = useState<
    Set<string>
  >(() => new Set());
  const [importSubmitting, setImportSubmitting] = useState(false);

  const registeredByNormalizedId = useMemo(() => {
    const map = new Map<string, WhatsappGroupOption>();
    for (const row of rows) {
      map.set(normalizeGroupIdForMatch(row.group_id), row);
    }
    return map;
  }, [rows]);

  const reassignTargets = useMemo(
    () =>
      rows.filter((row) => (reassignSource ? row.id !== reassignSource.id : true)),
    [rows, reassignSource],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/settings/whatsapp-groups");
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        groups?: WhatsappGroupOption[];
      }>(response);
      if (!response.ok || !payload.ok || !payload.groups) {
        throw new Error(payload.error ?? "No se pudo cargar la lista");
      }
      setRows(payload.groups);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccessBanner(null);
    setCreating(true);
    try {
      const response = await fetch("/api/settings/whatsapp-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          group_id: newGroupId.trim(),
        }),
      });
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        group?: WhatsappGroupOption;
      }>(response);
      if (!response.ok || !payload.ok || !payload.group) {
        throw new Error(payload.error ?? "No se pudo crear el grupo");
      }
      setRows((current) =>
        [...current, payload.group!].sort((a, b) =>
          a.name.localeCompare(b.name, "es"),
        ),
      );
      setNewName("");
      setNewGroupId("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(row: WhatsappGroupOption) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditGroupId(row.group_id);
    setFormError(null);
    setSuccessBanner(null);
  }

  async function handleSaveEdit(id: string) {
    setFormError(null);
    setSavingId(id);
    try {
      const response = await fetch(`/api/settings/whatsapp-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          group_id: editGroupId.trim(),
        }),
      });
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        group?: WhatsappGroupOption;
      }>(response);
      if (!response.ok || !payload.ok || !payload.group) {
        throw new Error(payload.error ?? "No se pudo guardar");
      }
      setRows((current) =>
        current
          .map((r) => (r.id === id ? payload.group! : r))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
      setEditingId(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingId(null);
    }
  }

  async function openImportDialog() {
    setImportOpen(true);
    setRemoteError(null);
    setSuccessBanner(null);
    setRemoteGroups([]);
    setImportSelectedNormalized(new Set());
    setRemoteLoading(true);
    try {
      const response = await fetch("/api/settings/whatsapp-groups/remote");
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        groups?: EvolutionRemoteGroup[];
      }>(response);
      if (!response.ok || !payload.ok || !payload.groups) {
        throw new Error(
          payload.error ??
            "Evolution no respondió. Revisa EVOLUTION_API_URL, EVOLUTION_INSTANCE y EVOLUTION_API_KEY.",
        );
      }
      setRemoteGroups(payload.groups);
    } catch (e) {
      setRemoteError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los grupos desde Evolution.",
      );
    } finally {
      setRemoteLoading(false);
    }
  }

  function toggleImportSelection(normalizedId: string, registered: boolean) {
    if (registered) {
      return;
    }
    setImportSelectedNormalized((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
      }
      return next;
    });
  }

  function selectAllImportable() {
    const next = new Set<string>();
    for (const g of remoteGroups) {
      const key = normalizeGroupIdForMatch(g.id);
      if (!registeredByNormalizedId.has(key)) {
        next.add(key);
      }
    }
    setImportSelectedNormalized(next);
  }

  function clearImportSelection() {
    setImportSelectedNormalized(new Set());
  }

  async function handleConfirmImport() {
    if (importSelectedNormalized.size === 0) {
      setRemoteError("Selecciona al menos un grupo nuevo para importar.");
      return;
    }
    const items = remoteGroups
      .filter((g) => importSelectedNormalized.has(normalizeGroupIdForMatch(g.id)))
      .map((g) => ({ id: g.id, subject: g.subject }));

    if (items.length === 0) {
      setRemoteError("No hay grupos válidos seleccionados.");
      return;
    }

    setImportSubmitting(true);
    setRemoteError(null);
    try {
      const response = await fetch("/api/settings/whatsapp-groups/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        groups?: WhatsappGroupOption[];
        imported?: number;
        skipped_duplicate?: number;
        skipped_invalid?: number;
      }>(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo importar");
      }
      if (payload.groups?.length) {
        setRows((current) =>
          [...current, ...payload.groups!].sort((a, b) =>
            a.name.localeCompare(b.name, "es"),
          ),
        );
      }
      setFormError(null);
      const parts: string[] = [];
      if ((payload.imported ?? 0) > 0) {
        parts.push(
          `Se importaron ${payload.imported} grupo(s).`,
        );
      }
      if ((payload.skipped_duplicate ?? 0) > 0) {
        parts.push(`${payload.skipped_duplicate} ya estaban registrados.`);
      }
      if ((payload.skipped_invalid ?? 0) > 0) {
        parts.push(
          `${payload.skipped_invalid} con ID en formato no válido fueron omitidos.`,
        );
      }
      if (parts.length === 0) {
        parts.push("No se añadió ningún grupo nuevo.");
      }
      setImportOpen(false);
      setRemoteGroups([]);
      setImportSelectedNormalized(new Set());
      setSuccessBanner(parts.join(" "));
    } catch (e) {
      setRemoteError(
        e instanceof Error ? e.message : "Error al importar grupos",
      );
    } finally {
      setImportSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "¿Eliminar este grupo del catálogo? No afecta DODAs ya resueltos.",
      )
    ) {
      return;
    }
    setFormError(null);
    setSuccessBanner(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/settings/whatsapp-groups/${id}`, {
        method: "DELETE",
      });
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        code?: string;
        pending?: Array<{ id: string; numero_integracion: string | null }>;
      }>(response);
      if (response.status === 409 && payload.code === "PENDING_DODAS") {
        const source = rows.find((row) => row.id === id) ?? null;
        setReassignSource(source);
        setReassignPending(payload.pending ?? []);
        setReassignTargetId("");
        setReassignError(payload.error ?? null);
        setReassignOpen(true);
        return;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error ??
            "No se pudo eliminar (¿hay DODAs pendientes usando este grupo?)",
        );
      }
      setRows((current) => current.filter((r) => r.id !== id));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReassignAndDelete() {
    if (!reassignSource || !reassignTargetId) {
      setReassignError("Selecciona el grupo de destino.");
      return;
    }
    setReassignSubmitting(true);
    setReassignError(null);
    try {
      const response = await fetch(
        `/api/settings/whatsapp-groups/${reassignSource.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reassign_to_group_row_id: reassignTargetId,
          }),
        },
      );
      const payload = await parseJson<{
        ok?: boolean;
        error?: string;
        reassigned?: number;
      }>(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo reasignar y eliminar");
      }
      setRows((current) =>
        current.filter((row) => row.id !== reassignSource.id),
      );
      setReassignOpen(false);
      setReassignSource(null);
      setReassignPending([]);
      setSuccessBanner(
        `Grupo eliminado. Se reasignaron ${payload.reassigned ?? reassignPending.length} DODA(s) pendientes.`,
      );
    } catch (e) {
      setReassignError(
        e instanceof Error ? e.message : "Error al reasignar y eliminar",
      );
    } finally {
      setReassignSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-900">
            Grupos de WhatsApp (DODA)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra los grupos a los que se puede enviar la notificación al
            liberar un pedimento. Solo se permiten grupos dados de alta aquí; el
            ID es el JID sin prefijo{" "}
            <span className="font-mono text-xs">chat.</span>. Se guarda solo con
            dígitos (sin{" "}
            <span className="font-mono text-xs">@g.us</span>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void openImportDialog()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#227DE8]/40 bg-white px-4 text-sm font-medium text-[#227DE8] shadow-sm transition hover:bg-[#227DE8]/5 sm:self-start"
        >
          <Download className="size-4" aria-hidden />
          Importar desde WhatsApp
        </button>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      {successBanner ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successBanner}
        </p>
      ) : null}

      {formError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {formError}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
      >
        <h3 className="text-sm font-medium text-slate-800">Nuevo grupo</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="wa_grp_name"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Nombre
            </label>
            <input
              id="wa_grp_name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={fieldClass}
              placeholder="Ej. Operaciones Norte"
              disabled={creating}
            />
          </div>
          <div>
            <label
              htmlFor="wa_grp_id"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              ID del grupo
            </label>
            <input
              id="wa_grp_id"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              className={fieldClass}
              placeholder="120363… o 120363…@g.us"
              disabled={creating}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={creating || !newName.trim() || !newGroupId.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Agregar grupo
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
          <h3 className="text-sm font-medium text-slate-800">Catálogo</h3>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
            Cargando grupos…
          </p>
        ) : (
          <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    ID almacenado
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700 w-40" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Aún no hay grupos registrados.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isEditing = editingId === row.id;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 align-top">
                          {isEditing ? (
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className={fieldClass}
                              disabled={savingId === row.id}
                            />
                          ) : (
                            <span className="font-medium text-slate-900">
                              {row.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isEditing ? (
                            <input
                              value={editGroupId}
                              onChange={(e) => setEditGroupId(e.target.value)}
                              className={`${fieldClass} font-mono text-xs`}
                              disabled={savingId === row.id}
                            />
                          ) : (
                            <span className="font-mono text-xs text-slate-700">
                              {row.group_id}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  disabled={savingId === row.id}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveEdit(row.id)}
                                  disabled={
                                    savingId === row.id ||
                                    !editName.trim() ||
                                    !editGroupId.trim()
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#227DE8] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#1a6ed4] disabled:opacity-50"
                                >
                                  {savingId === row.id ? (
                                    <Loader2
                                      className="size-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Pencil className="size-3" aria-hidden />
                                  )}
                                  Guardar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(row)}
                                  disabled={
                                    deletingId === row.id || editingId != null
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <Pencil className="size-3" aria-hidden />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(row.id)}
                                  disabled={
                                    deletingId === row.id || editingId != null
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === row.id ? (
                                    <Loader2
                                      className="size-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Trash2 className="size-3" aria-hidden />
                                  )}
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reassignOpen && reassignSource ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => !reassignSubmitting && setReassignOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="wa-reassign-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3
                id="wa-reassign-title"
                className="text-base font-medium text-slate-900"
              >
                Reasignar y eliminar
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                «{reassignSource.name}» tiene {reassignPending.length} DODA(s)
                pendientes
                {reassignPending.length > 0
                  ? `: ${reassignPending
                      .map(
                        (d) =>
                          d.numero_integracion?.trim() || d.id.slice(0, 8),
                      )
                      .slice(0, 6)
                      .join(", ")}${
                      reassignPending.length > 6
                        ? ` y ${reassignPending.length - 6} más`
                        : ""
                    }`
                  : ""}
                .
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              {reassignError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {reassignError}
                </p>
              ) : null}
              <div>
                <label
                  htmlFor="wa_reassign_target"
                  className="mb-1.5 block text-xs font-medium text-slate-600"
                >
                  Mover DODAs pendientes a
                </label>
                <select
                  id="wa_reassign_target"
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className={fieldClass}
                  disabled={reassignSubmitting || reassignTargets.length === 0}
                >
                  <option value="">Selecciona un grupo…</option>
                  {reassignTargets.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                {reassignTargets.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No hay otro grupo en el catálogo. Crea o importa uno antes
                    de reasignar.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => !reassignSubmitting && setReassignOpen(false)}
                disabled={reassignSubmitting}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleReassignAndDelete()}
                disabled={
                  reassignSubmitting ||
                  !reassignTargetId ||
                  reassignTargets.length === 0
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reassignSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                Reasignar a otro grupo y eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() =>
            !importSubmitting && !remoteLoading && setImportOpen(false)
          }
        >
          <div
            role="dialog"
            aria-labelledby="wa-import-title"
            className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3
                  id="wa-import-title"
                  className="text-base font-medium text-slate-900"
                >
                  Importar desde WhatsApp (Evolution)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Los grupos ya registrados aparecen deshabilitados. Puedes
                  seguir usando el formulario manual si Evolution no responde.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  !importSubmitting && !remoteLoading && setImportOpen(false)
                }
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                aria-label="Cerrar"
                disabled={importSubmitting || remoteLoading}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {remoteLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-600">
                  <Loader2 className="size-8 animate-spin text-[#227DE8]" />
                  Obteniendo grupos desde Evolution…
                </div>
              ) : remoteError && remoteGroups.length === 0 ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  {remoteError}
                </p>
              ) : (
                <>
                  {remoteError ? (
                    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {remoteError}
                    </p>
                  ) : null}
                  {remoteGroups.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">
                      Evolution no devolvió grupos en esta instancia.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {remoteGroups.map((g, index) => {
                        const normalized = normalizeGroupIdForMatch(g.id);
                        const registered = registeredByNormalizedId.get(
                          normalized,
                        );
                        const already = Boolean(registered);
                        const checked = already
                          ? true
                          : importSelectedNormalized.has(normalized);
                        return (
                          <li key={`${normalized}-${index}`}>
                            <label
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                                already
                                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                                  : "border-slate-200 bg-white hover:border-[#227DE8]/30"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-[#227DE8] focus:ring-[#227DE8]/30 disabled:cursor-not-allowed"
                                checked={checked}
                                disabled={already}
                                onChange={() =>
                                  toggleImportSelection(normalized, already)
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="font-medium text-slate-900">
                                  {g.subject}
                                  {already ? (
                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                      {`(ya registrado como «${registered!.name}»)`}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block font-mono text-xs text-slate-600 break-all">
                                  {g.id}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    remoteLoading ||
                    importSubmitting ||
                    remoteGroups.length === 0
                  }
                  onClick={selectAllImportable}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Seleccionar todos los nuevos
                </button>
                <button
                  type="button"
                  disabled={
                    remoteLoading || importSubmitting || remoteGroups.length === 0
                  }
                  onClick={clearImportSelection}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Limpiar selección
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    !importSubmitting && !remoteLoading && setImportOpen(false)
                  }
                  disabled={importSubmitting || remoteLoading}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmImport()}
                  disabled={
                    remoteLoading ||
                    importSubmitting ||
                    remoteGroups.length === 0 ||
                    importSelectedNormalized.size === 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#227DE8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a6ed4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importSubmitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                  Importar seleccionados
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
