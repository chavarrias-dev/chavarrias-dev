"use client";

import { useCallback, useEffect, useRef } from "react";
import { CircleHelp } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type OnboardingTourProps = {
  userId: string;
  autoStart?: boolean;
};

function adminStorageKey(userId: string): string {
  return `tour_completed_admin_${userId}`;
}

function clientStorageKey(userId: string): string {
  return `tour_completed_client_${userId}`;
}

function markAdminTourDismissed(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(adminStorageKey(userId), "true");
}

function isAdminTourDismissed(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(adminStorageKey(userId)) === "true";
}

function markClientTourDismissed(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(clientStorageKey(userId), "true");
}

function isClientTourDismissed(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(clientStorageKey(userId)) === "true";
}

function createTourConfig(markDismissed: () => void) {
  return {
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
    onDestroyStarted: (
      _element: Element | undefined,
      _step: DriveStep,
      { driver: driverInstance }: { driver: { destroy: () => void } },
    ) => {
      markDismissed();
      driverInstance.destroy();
    },
  } as const;
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

function buildClientTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="sidebar"]',
      popover: {
        title: "Menú principal",
        description:
          "Este es tu menú. Desde aquí accedes a las secciones disponibles para ti como cliente.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="dashboard-client-home"]',
      popover: {
        title: "Tu panel de inicio",
        description:
          "Aquí ves alertas de documentos, tus facturas y pedimentos recientes. También puedes ir a tu perfil de cliente.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-expediente"]',
      popover: {
        title: "Mi Expediente",
        description:
          "Consulta el estado de tus documentos requeridos y sube los PDFs que te solicite tu agente.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-facturas"]',
      popover: {
        title: "Facturas",
        description:
          "Consulta y descarga las facturas asociadas a tu cuenta. Solo lectura.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-pedimentos"]',
      popover: {
        title: "Pedimentos",
        description:
          "Revisa el detalle y archivos de tus pedimentos aduanales.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-messages"]',
      popover: {
        title: "Mensajes",
        description:
          "Envía mensajes al equipo de Chavarrias y recibe respuestas en tiempo real.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="user-profile"]',
      popover: {
        title: "Tu perfil",
        description:
          "Haz clic aquí para ver los datos de tu cuenta en el CRM.",
        side: "right",
        align: "end",
      },
    },
    {
      popover: {
        title: "¡Listo!",
        description:
          "Ya conoces las opciones disponibles para ti. Puedes repetir este tutorial cuando quieras.",
        side: "over",
        align: "center",
      },
    },
  ];
}

function createAdminTour(userId: string) {
  return driver({
    ...createTourConfig(() => markAdminTourDismissed(userId)),
    steps: buildAdminTourSteps(),
  });
}

function createClientTour(userId: string) {
  return driver({
    ...createTourConfig(() => markClientTourDismissed(userId)),
    steps: buildClientTourSteps(),
  });
}

export function startAdminTour(userId: string): void {
  createAdminTour(userId).drive();
}

export function startClientTour(userId: string): void {
  createClientTour(userId).drive();
}

export function OnboardingTour({
  userId,
  autoStart = true,
}: OnboardingTourProps) {
  const hasAutoStarted = useRef(false);

  const tryAutoStart = useCallback(() => {
    if (!autoStart || hasAutoStarted.current || isAdminTourDismissed(userId)) {
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

type TutorialButtonProps = {
  userId: string;
  collapsed?: boolean;
  className?: string;
};

function tutorialButtonClassName(className?: string): string {
  return [
    "inline-flex items-center gap-1.5 rounded-lg border border-[#227DE8] bg-white text-sm font-medium text-[#227DE8] shadow-sm transition-all duration-200 hover:bg-[#227DE8]/5",
    className ?? "h-9 px-3",
  ].join(" ");
}

export function TutorialButton({
  userId,
  collapsed = false,
  className,
}: TutorialButtonProps) {
  return (
    <button
      type="button"
      title="Ver tutorial del CRM"
      onClick={() => startAdminTour(userId)}
      className={`${tutorialButtonClassName(className)} ${
        collapsed ? "size-9 justify-center px-0" : "w-full justify-center"
      }`}
    >
      <CircleHelp className="size-4 shrink-0" aria-hidden />
      {collapsed ? (
        <span className="sr-only">Ver tutorial</span>
      ) : (
        <span>Ver tutorial</span>
      )}
    </button>
  );
}

export function ClientOnboardingTour({
  userId,
  autoStart = true,
}: OnboardingTourProps) {
  const hasAutoStarted = useRef(false);

  const tryAutoStart = useCallback(() => {
    if (!autoStart || hasAutoStarted.current || isClientTourDismissed(userId)) {
      return;
    }

    const sidebar = document.querySelector('[data-tour="sidebar"]');
    const home = document.querySelector('[data-tour="dashboard-client-home"]');
    if (!sidebar || !home) {
      return;
    }

    hasAutoStarted.current = true;
    startClientTour(userId);
  }, [autoStart, userId]);

  useEffect(() => {
    const timer = window.setTimeout(tryAutoStart, 700);
    return () => window.clearTimeout(timer);
  }, [tryAutoStart]);

  return null;
}

export function ClientTutorialButton({
  userId,
  collapsed = false,
  className,
}: TutorialButtonProps) {
  return (
    <button
      type="button"
      title="Ver tutorial del CRM"
      onClick={() => startClientTour(userId)}
      className={`${tutorialButtonClassName(className)} ${
        collapsed ? "size-9 justify-center px-0" : "w-full justify-center"
      }`}
    >
      <CircleHelp className="size-4 shrink-0" aria-hidden />
      {collapsed ? (
        <span className="sr-only">Ver tutorial</span>
      ) : (
        <span>Ver tutorial</span>
      )}
    </button>
  );
}
