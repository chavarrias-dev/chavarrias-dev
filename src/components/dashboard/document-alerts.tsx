import Link from "next/link";
import { fetchDocumentAlerts } from "@/lib/document-status";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatShortDate(value: string): string {
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function DocumentAlerts() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const role = await getUserRole(supabase, user.id);
  const isStaff = role === "admin" || role === "empleado";

  let clientIdFilter: string | undefined;
  if (role === "cliente" && user.email) {
    const { data: ownRow } = await supabase
      .from("clients")
      .select("id")
      .eq("email", user.email.trim())
      .maybeSingle();
    const ownClientId = (ownRow as { id: string } | null)?.id;
    if (!ownClientId) {
      return null;
    }
    clientIdFilter = ownClientId;
  } else if (!isStaff) {
    return null;
  }

  const alerts = await fetchDocumentAlerts(supabase, {
    clientId: clientIdFilter,
  });

  if (alerts.length === 0) {
    return null;
  }

  const vencidos = alerts.filter((a) => a.status === "vencido").length;
  const porVencer = alerts.filter((a) => a.status === "por_vencer").length;

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100/80 [&::-webkit-details-marker]:hidden">
        <svg
          className="size-4 shrink-0 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71a1.125 1.125 0 0 0 1.971-1.037l-1.372-2.378a1.125 1.125 0 0 0-.966-.629H6.832a1.125 1.125 0 0 0-.966.629L4.494 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <span className="hidden sm:inline">Documentos</span>
        <span className="badge-pulse-subtle inline-flex min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-xs font-bold text-white">
          {alerts.length}
        </span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-sm font-medium text-slate-900">
            Alertas de documentos
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {vencidos > 0 ? `${vencidos} vencido${vencidos === 1 ? "" : "s"}` : null}
            {vencidos > 0 && porVencer > 0 ? " · " : null}
            {porVencer > 0
              ? `${porVencer} por vencer`
              : null}
          </p>
        </div>
        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {alerts.slice(0, 8).map((alert) => (
            <li key={alert.id} className="px-4 py-3">
              <p className="text-sm text-slate-800">
                El documento{" "}
                <span className="font-medium">{alert.documentType}</span> del
                cliente{" "}
                <span className="font-medium">{alert.clientName}</span>{" "}
                {alert.status === "vencido" ? "venció" : "vence"} el{" "}
                <span className="font-medium">
                  {formatShortDate(alert.fechaVencimiento)}
                </span>
              </p>
              {isStaff ? (
                <Link
                  href={`/dashboard/clients/${alert.clientId}`}
                  className="mt-1 inline-block text-xs font-medium text-[#227DE8] hover:underline"
                >
                  Ver perfil del cliente →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        {alerts.length > 8 ? (
          <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500">
            +{alerts.length - 8} alertas más en el inicio
          </div>
        ) : null}
      </div>
    </details>
  );
}
