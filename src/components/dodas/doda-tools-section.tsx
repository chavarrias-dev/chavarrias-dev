"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { ClientOption } from "@/components/clients/types";
import { DodaLookupUploader } from "@/components/dodas/doda-lookup-uploader";
import { DodaScheduleSection } from "@/components/dodas/doda-schedule-section";

type DodaToolsSectionProps = {
  clients: ClientOption[];
};

export function DodaToolsSection({ clients }: DodaToolsSectionProps) {
  const [consultOpen, setConsultOpen] = useState(false);

  return (
    <>
      <DodaScheduleSection clients={clients} />

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setConsultOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50/80 sm:px-6"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <Search className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-medium text-slate-800">
                Consulta puntual
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Revisión única por archivo o número, sin monitoreo continuo.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`size-5 shrink-0 text-slate-400 transition-transform ${
              consultOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        {consultOpen ? (
          <div className="border-t border-slate-100 px-5 pb-5 sm:px-6 sm:pb-6">
            <DodaLookupUploader clients={clients} variant="secondary" />
          </div>
        ) : null}
      </section>
    </>
  );
}
