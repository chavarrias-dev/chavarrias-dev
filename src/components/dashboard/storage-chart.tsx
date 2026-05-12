"use client";

import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CRM_DOCUMENTS_BUCKET } from "@/lib/supabase-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const LIMIT_MB = 1024;
const ACCENT = "#227DE8";
const AVAILABLE = "#e5e7eb";
const WARNING_PCT = 80;

function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

async function sumBytesUnderPrefix(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  prefix: string,
): Promise<number> {
  let total = 0;
  let offset = 0;
  const limit = 1000;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(CRM_DOCUMENTS_BUCKET)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.error("storage list", prefix, error.message);
      break;
    }
    if (!data?.length) {
      break;
    }

    for (const item of data) {
      const childPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id !== null) {
        const sz = item.metadata?.size;
        total += typeof sz === "number" && Number.isFinite(sz) ? sz : 0;
      } else {
        total += await sumBytesUnderPrefix(supabase, childPath);
      }
    }

    if (data.length < limit) {
      break;
    }
    offset += limit;
  }

  return total;
}

export function StorageChart() {
  const [usedBytes, setUsedBytes] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setLoadError("Sesión no válida.");
          setUsedBytes(0);
        }
        return;
      }

      try {
        const [facturas, pedimentos] = await Promise.all([
          sumBytesUnderPrefix(supabase, "facturas"),
          sumBytesUnderPrefix(supabase, "pedimentos"),
        ]);
        if (!cancelled) {
          setUsedBytes(facturas + pedimentos);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "No se pudo leer el almacenamiento",
          );
          setUsedBytes(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usedMb = usedBytes != null ? bytesToMb(usedBytes) : null;
  const pct =
    usedMb != null ? Math.round((usedMb / LIMIT_MB) * 1000) / 10 : null;
  const availableMb =
    usedMb != null ? Math.max(0, LIMIT_MB - usedMb) : null;
  const showWarning = pct != null && pct >= WARNING_PCT;

  const chartData = useMemo(() => {
    if (usedMb == null) return [];
    const usedCap = Math.min(usedMb, LIMIT_MB);
    const freeCap = Math.max(0, LIMIT_MB - usedMb);

    if (usedCap <= 0) {
      return [{ name: "Disponible", value: LIMIT_MB, fill: AVAILABLE }];
    }
    if (freeCap <= 0) {
      return [{ name: "En uso", value: LIMIT_MB, fill: ACCENT }];
    }
    return [
      { name: "En uso", value: usedCap, fill: ACCENT },
      { name: "Disponible", value: freeCap, fill: AVAILABLE },
    ];
  }, [usedMb]);

  if (usedMb == null) {
    return (
      <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-lg bg-slate-50/80">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-[#227DE8] border-t-transparent"
            aria-hidden
          />
          Cargando uso de almacenamiento…
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col font-poppins ${
        showWarning ? "rounded-xl ring-1 ring-amber-200/80" : ""
      }`}
    >
      {showWarning ? (
        <p
          className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-900"
          role="status"
        >
          Has superado el {WARNING_PCT}% del límite de almacenamiento (1&nbsp;GB).
          Considera liberar espacio o actualizar tu plan.
        </p>
      ) : null}

      {loadError ? (
        <p className="mb-2 text-xs text-red-700" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
        <div className="h-[150px] w-full max-w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={1}
                strokeWidth={0}
                isAnimationActive
              >
                {chartData.map((entry, i) => (
                  <Cell key={`slice-${entry.name}-${i}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} MB`, ""]}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  fontFamily: "var(--font-poppins-family), system-ui, sans-serif",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
          <p className="text-2xl font-semibold tabular-nums leading-tight text-slate-900">
            {pct != null ? `${pct}%` : "—"}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-medium text-[#227DE8]">
              {usedMb.toFixed(2)} MB
            </span>{" "}
            usados
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">
              {availableMb != null ? availableMb.toFixed(2) : "—"} MB
            </span>{" "}
            disponibles de {LIMIT_MB} MB
          </p>
          <p className="text-[11px] leading-snug text-slate-500">
            {usedMb.toFixed(2)} MB / {LIMIT_MB} MB totales
          </p>
        </div>
      </div>
    </div>
  );
}
