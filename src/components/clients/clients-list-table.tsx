"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteClientForm } from "@/components/clients/delete-client-form";

export type ClientsListRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  tipo_razon_social: string | null;
  puesto: string | null;
  rfc: string | null;
  created_at: string | null;
};

type ClientsListTableProps = {
  rows: ClientsListRow[];
  isStaff: boolean;
  isAdmin: boolean;
};

function stopRowNavigate(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

export function ClientsListTable({
  rows,
  isStaff,
  isAdmin,
}: ClientsListTableProps) {
  const router = useRouter();

  function goToProfile(clientId: string) {
    router.push(`/dashboard/clients/${clientId}`);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-3 font-medium text-slate-700">Nombre</th>
              <th className="px-4 py-3 font-medium text-slate-700">Correo</th>
              <th className="px-4 py-3 font-medium text-slate-700">Teléfono</th>
              <th className="px-4 py-3 font-medium text-slate-700">Empresa</th>
              <th className="px-4 py-3 font-medium text-slate-700">RFC</th>
              <th className="px-4 py-3 font-medium text-slate-700">Alta</th>
              {isStaff ? (
                <th className="px-4 py-3 font-medium text-slate-700">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={isStaff ? 7 : 6}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Aún no hay clientes.{" "}
                  {isAdmin ? (
                    <Link
                      href="/dashboard/users/new"
                      className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
                    >
                      Crear usuario cliente
                    </Link>
                  ) : (
                    "Contacta a un administrador para registrar clientes."
                  )}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => goToProfile(c.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      goToProfile(c.id);
                    }
                  }}
                  className="cursor-pointer border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50/60"
                  aria-label={`Ver perfil de ${c.full_name}`}
                >
                  <td className="px-4 py-3 font-medium text-[#227DE8]">
                    {c.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{c.company_name ?? "—"}</div>
                    {c.tipo_razon_social || c.puesto ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {[c.tipo_razon_social, c.puesto]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {c.rfc ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  {isStaff ? (
                    <td
                      className="px-4 py-3"
                      onClick={stopRowNavigate}
                      onKeyDown={stopRowNavigate}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/clients/${c.id}`}
                          className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                        >
                          Ver perfil
                        </Link>
                        <Link
                          href={`/dashboard/clients/${c.id}/edit`}
                          className="font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
                        >
                          Editar
                        </Link>
                        <DeleteClientForm clientId={c.id} />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
