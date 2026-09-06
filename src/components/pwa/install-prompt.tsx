"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share2, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "chavarrias-pwa-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone PWA mode
    const isAppStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone === true);

    if (isAppStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if already dismissed in this session
    const isDismissed = sessionStorage.getItem(STORAGE_KEY);
    if (isDismissed) {
      return;
    }

    // Check if device is iOS (Safari doesn't support beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream: boolean }).MSStream;

    if (isIosDevice) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("PWA install error:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(STORAGE_KEY, "true");
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Instalar aplicación"
      className="fixed bottom-3 left-3 right-3 z-50 sm:bottom-4 sm:left-auto sm:right-6 sm:w-96"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xl shadow-slate-900/15 backdrop-blur-md transition-all duration-300 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#227DE8] to-[#1456A8] p-1.5 shadow-sm ring-1 ring-black/5">
              <Image
                src="/icons/icon-96x96.png"
                alt="Chavarrias CRM"
                width={40}
                height={40}
                className="size-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-sm font-semibold tracking-tight text-slate-900">
                ¡Instala el CRM Chavarrias!
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">
                Accede más rápido desde tu pantalla de inicio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar notificación de instalación"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {showIOSInstructions ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-2.5 text-xs leading-relaxed text-blue-900">
            <p className="font-medium">Para instalar en iPhone/iPad:</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-800">
              1. Pulsa el botón Compartir <Share2 className="inline size-3.5" />
            </p>
            <p className="text-[11px] text-blue-800">
              2. Selecciona <strong>&ldquo;Agregar a pantalla de inicio&rdquo;</strong>
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleInstallClick}
            className="btn-primary-motion inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#227DE8] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a6ed4] active:scale-[0.98]"
          >
            <Download className="size-3.5" />
            {isIOS ? "Ver cómo instalar" : "Instalar"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
