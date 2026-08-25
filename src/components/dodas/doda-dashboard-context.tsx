"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DodaDashboardRow } from "@/lib/doda-dashboard-categories";
import type { DodaRecord } from "@/lib/doda-types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DodaDashboardContextValue = {
  dodas: DodaDashboardRow[];
  refreshDashboard: () => Promise<void>;
  queryResults: DodaRecord[];
  setQueryResults: (items: DodaRecord[]) => void;
  appendQueryResult: (item: DodaRecord) => void;
  clearQueryResults: () => void;
  removeDoda: (id: string) => void;
  updateDoda: (id: string, patch: Partial<DodaRecord>) => void;
};

const DodaDashboardContext = createContext<DodaDashboardContextValue | null>(
  null,
);

export function DodaDashboardProvider({
  initialDodas,
  children,
}: {
  initialDodas: DodaDashboardRow[];
  children: React.ReactNode;
}) {
  const [dodas, setDodas] = useState(initialDodas);
  const [queryResults, setQueryResultsState] = useState<DodaRecord[]>([]);

  useEffect(() => {
    setDodas(initialDodas);
  }, [initialDodas]);

  // Reflect cron/manual status changes as soon as Postgres commits them, so a
  // resolved/failed DODA moves out of "En monitoreo" without a manual reload.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("dodas:dashboard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dodas" },
        (payload) => {
          const updated = payload.new as DodaRecord;
          setDodas((current) =>
            current.map((doda) =>
              doda.id === updated.id ? { ...doda, ...updated } : doda,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "dodas" },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          if (!deletedId) return;
          setDodas((current) => current.filter((doda) => doda.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const setQueryResults = useCallback((items: DodaRecord[]) => {
    setQueryResultsState(items);
  }, []);

  const appendQueryResult = useCallback((item: DodaRecord) => {
    setQueryResultsState((current) => [...current, item]);
  }, []);

  const clearQueryResults = useCallback(() => {
    setQueryResultsState([]);
  }, []);

  const removeDoda = useCallback((id: string) => {
    setDodas((current) => current.filter((doda) => doda.id !== id));
  }, []);

  const updateDoda = useCallback((id: string, patch: Partial<DodaRecord>) => {
    setDodas((current) =>
      current.map((doda) => (doda.id === id ? { ...doda, ...patch } : doda)),
    );
  }, []);

  const refreshDashboard = useCallback(async () => {
    const response = await fetch("/api/dodas/dashboard", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      dodas?: DodaDashboardRow[];
      error?: string;
    };

    if (!response.ok || !payload.ok || !payload.dodas) {
      throw new Error(payload.error ?? "No se pudo actualizar el panel DODA");
    }

    setDodas(payload.dodas);
  }, []);

  const value = useMemo(
    () => ({
      dodas,
      refreshDashboard,
      queryResults,
      setQueryResults,
      appendQueryResult,
      clearQueryResults,
      removeDoda,
      updateDoda,
    }),
    [
      dodas,
      refreshDashboard,
      queryResults,
      setQueryResults,
      appendQueryResult,
      clearQueryResults,
      removeDoda,
      updateDoda,
    ],
  );

  return (
    <DodaDashboardContext.Provider value={value}>
      {children}
    </DodaDashboardContext.Provider>
  );
}

export function useDodaDashboard() {
  const context = useContext(DodaDashboardContext);
  if (!context) {
    throw new Error("useDodaDashboard must be used within DodaDashboardProvider");
  }
  return context;
}
