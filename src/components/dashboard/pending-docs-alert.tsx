"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";

type PendingDocsAlertProps = {
  userId: string;
  role: string | null;
  clientId: string | null;
  pendingDocuments: string[];
};

function storageKey(userId: string): string {
  return `docs_alert_shown_${userId}`;
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function markShownToday(userId: string): void {
  localStorage.setItem(storageKey(userId), todayDateString());
}

export function PendingDocsAlert({
  userId,
  role,
  clientId,
  pendingDocuments,
}: PendingDocsAlertProps) {
  const [showModal, setShowModal] = useState(false);
  const pendingCount = pendingDocuments.length;

  useEffect(() => {
    if (role !== "cliente" || !clientId) {
      setShowModal(false);
      return;
    }

    const today = todayDateString();
    const savedDate = localStorage.getItem(storageKey(userId));
    if (savedDate === today) {
      setShowModal(false);
      return;
    }

    if (pendingCount === 0) {
      setShowModal(false);
      return;
    }

    setShowModal(true);
  }, [userId, role, clientId, pendingCount]);

  const dismissModal = useCallback(() => {
    markShownToday(userId);
    setShowModal(false);
  }, [userId]);

  if (!clientId || pendingCount === 0) {
    return null;
  }

  return (
    <ModalShell
      open={showModal}
      onClose={dismissModal}
      panelClassName="font-poppins flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2
            id="pending-docs-welcome-title"
            className="text-lg font-medium tracking-tight text-slate-900"
          >
            ¡Bienvenido! Tienes documentos pendientes 📋
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Para comenzar a operar necesitas subir los siguientes documentos:
          </p>
        </div>
        <button
          type="button"
          onClick={dismissModal}
          className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-5 py-3">
        {pendingDocuments.map((documentType) => (
          <li
            key={documentType}
            className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-0"
          >
            <span className="text-slate-400" aria-hidden>
              ●
            </span>
            <span className="text-sm text-slate-800">{documentType}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4">
        <Link
          href={`/dashboard/clients/${clientId}#mi-expediente`}
          className="btn-primary-motion inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4]"
          onClick={dismissModal}
        >
          Ir a mi expediente
        </Link>
        <button
          type="button"
          onClick={dismissModal}
          className="text-xs font-medium text-slate-500 underline-offset-2 transition-all duration-200 hover:text-slate-700 hover:underline"
        >
          Recordar más tarde
        </button>
      </div>
    </ModalShell>
  );
}
