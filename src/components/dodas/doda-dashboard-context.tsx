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

type DodaDashboardContextValue = {
  dodas: DodaDashboardRow[];
  refreshDashboard: () => Promise<void>;
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

  useEffect(() => {
    setDodas(initialDodas);
  }, [initialDodas]);

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
    () => ({ dodas, refreshDashboard }),
    [dodas, refreshDashboard],
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
