"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type DodaHighlightOnQueryProps = {
  dodaIds: string[];
};

export function DodaHighlightOnQuery({ dodaIds }: DodaHighlightOnQueryProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  useEffect(() => {
    if (!highlightId || !dodaIds.includes(highlightId)) {
      return;
    }

    const row = document.getElementById(`doda-row-${highlightId}`);
    if (!row) {
      return;
    }

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("ring-2", "ring-[#227DE8]", "ring-offset-2");

    const timer = window.setTimeout(() => {
      row.classList.remove("ring-2", "ring-[#227DE8]", "ring-offset-2");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [dodaIds, highlightId]);

  return null;
}
