"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import type { ClientOption } from "@/components/clients/types";
import { DodaLookupUploader } from "@/components/dodas/doda-lookup-uploader";
import { DodaScheduleModal } from "@/components/dodas/doda-schedule-modal";

type DodaToolsSectionProps = {
  clients: ClientOption[];
};

export function DodaToolsSection({ clients }: DodaToolsSectionProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#227DE8]/30 bg-[#227DE8]/5 px-4 text-sm font-medium text-[#227DE8] transition hover:bg-[#227DE8]/10"
        >
          <CalendarClock className="size-4" aria-hidden />
          Programar DODA
        </button>
      </div>

      <DodaLookupUploader clients={clients} />

      <DodaScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        clients={clients}
      />
    </>
  );
}
