"use client";

import { useCallback, useEffect, useRef } from "react";
import { CircleHelp } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type OnboardingTourProps = {
  userId: string;
  autoStart?: boolean;
};

function storageKey(userId: string): string {
  return `tour_completed_admin_${userId}`;
}

function markTourCompleted(userId: string): void {
  localStorage.setItem(storageKey(userId), "true");
}

function isTourCompleted(userId: string): boolean {
  return localStorage.getItem(storageKey(userId)) === "true";
}

function buildAdminTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="sidebar"]',
      popover: {
        title: "Menú principal",
        description:
          "Este es tu menú principal. Desde aquí accedes a todas las secciones del CRM.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="dashboard-stats"]',
      popover: {
        title: "Resumen del dashboard",
        description:
          "Aquí ves el resumen: documentos pendientes, mensajes y almacenamiento.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-clients"]',
      popover: {
        title: "Clientes",
        description:
          "Gestiona tus clientes, su expediente y documentos.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-facturas"]',
      popover: {
        title: "Facturas",
        description: "Registra y administra las facturas de tus clientes.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-pedimentos"]',
      popover: {
        title: "Pedimentos",
        description: "Controla los pedimentos aduanales.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-users"]',
      popover: {
        title: "Usuarios",
        description:
          "Crea y administra usuarios: admins, empleados y clientes.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-messages"]',
      popover: {
        title: "Mensajes",
        description:
          "Sistema de mensajería interna con tus clientes y equipo.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-tools"]',
      popover: {
        title: "Herramientas",
        description: "Herramientas útiles como el unificador de PDFs.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="user-profile"]',
      popover: {
        title: "Tu perfil",
        description: "Haz clic aquí para ver tu perfil.",
        side: "right",
        align: "end",
      },
    },
    {
      popover: {
        title: "¡Listo!",
        description:
          "¡Listo! Ya conoces el CRM Chavarrias. Puedes repetir este tutorial cuando quieras.",
        side: "over",
        align: "center",
      },
    },
  ];
}

function createAdminTour(userId: string) {
  return driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    smoothScroll: true,
    overlayColor: "#0f172a",
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: "crm-driver-popover",
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Finalizar",
    steps: buildAdminTourSteps(),
    onDestroyed: () => {
      markTourCompleted(userId);
    },
  });
}

export function startAdminTour(userId: string): void {
  const driverObj = createAdminTour(userId);
  driverObj.drive();
}

export function OnboardingTour({
  userId,
  autoStart = true,
}: OnboardingTourProps) {
  const hasAutoStarted = useRef(false);

  const tryAutoStart = useCallback(() => {
    if (!autoStart || hasAutoStarted.current || isTourCompleted(userId)) {
      return;
    }

    const sidebar = document.querySelector('[data-tour="sidebar"]');
    const stats = document.querySelector('[data-tour="dashboard-stats"]');
    if (!sidebar || !stats) {
      return;
    }

    hasAutoStarted.current = true;
    startAdminTour(userId);
  }, [autoStart, userId]);

  useEffect(() => {
    const timer = window.setTimeout(tryAutoStart, 700);
    return () => window.clearTimeout(timer);
  }, [tryAutoStart]);

  return null;
}

export function TutorialButton({ userId }: { userId: string }) {
  return (
    <button
      type="button"
      onClick={() => startAdminTour(userId)}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#227DE8] bg-white px-3 text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5"
    >
      <CircleHelp className="size-4 shrink-0" aria-hidden />
      Ver tutorial
    </button>
  );
}
