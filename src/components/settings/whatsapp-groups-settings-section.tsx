"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "¿Eliminar este grupo del catálogo? No afecta DODAs ya resueltos.",
      )
    ) {
      return;
    }
    setFormError(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/settings/whatsapp-groups/${id}`, {
        method: "DELETE",
      });
      const payload = await parseJson<{ ok?: boolean; error?: string }>(
        response,
      );
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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-slate-900">
          Grupos de WhatsApp (DODA)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Registra los grupos a los que se puede enviar la notificación al
          liberar un pedimento. Solo se permiten grupos dados de alta aquí; el
          ID es el JID sin prefijo{" "}
          <span className="font-mono text-xs">chat.</span> (dígitos, opcional{" "}
          <span className="font-mono text-xs">@g.us</span>).
        </p>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
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
    </section>
  );
}
