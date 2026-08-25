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

type DodaDashboardContextValue = {
  dodas: DodaDashboardRow[];
  refreshDashboard: () => Promise<void>;
  queryResults: DodaRecord[];
  setQueryResults: (items: DodaRecord[]) => void;
  appendQueryResult: (item: DodaRecord) => void;
  updateQueryResult: (id: string, patch: Partial<DodaRecord>) => void;
  clearQueryResults: () => void;
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

  const setQueryResults = useCallback((items: DodaRecord[]) => {
    setQueryResultsState(items);
  }, []);

  const appendQueryResult = useCallback((item: DodaRecord) => {
    setQueryResultsState((current) => [...current, item]);
  }, []);

  const updateQueryResult = useCallback(
    (id: string, patch: Partial<DodaRecord>) => {
      setQueryResultsState((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const clearQueryResults = useCallback(() => {
    setQueryResultsState([]);
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
      updateQueryResult,
      clearQueryResults,
    }),
    [
      dodas,
      refreshDashboard,
      queryResults,
      setQueryResults,
      appendQueryResult,
      updateQueryResult,
      clearQueryResults,
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
