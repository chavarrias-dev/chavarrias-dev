"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

const EXIT_MS = 200;

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  align?: "center" | "bottom-sheet";
  closeOnOverlay?: boolean;
  overlayClassName?: string;
};

export function ModalShell({
  open,
  onClose,
  children,
  panelClassName = "",
  align = "center",
  closeOnOverlay = true,
  overlayClassName = "bg-slate-900/50",
}: ModalShellProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const mountedRef = useRef(mounted);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [open]);

  const requestClose = useCallback(() => {
    if (closing || !mountedRef.current) {
      return;
    }

    setClosing(true);
    window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      onClose();
    }, EXIT_MS);
  }, [closing, onClose]);

  useEffect(() => {
    if (!mounted || closing) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, closing, requestClose]);

  if (!mounted) {
    return null;
  }

  const alignClass =
    align === "bottom-sheet"
      ? "items-end justify-center sm:items-center"
      : "items-center justify-center";

  const handleOverlayClick = () => {
    if (closeOnOverlay) {
      requestClose();
    }
  };

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex p-4 ${alignClass}`}
      role="presentation"
    >
      <button
        type="button"
        className={`absolute inset-0 ${overlayClassName} ${
          closing ? "animate-overlay-out" : "animate-overlay-in"
        }`}
        aria-label="Cerrar"
        onClick={handleOverlayClick}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative ${closing ? "animate-modal-out" : "animate-modal-in"} ${panelClassName}`}
        onClick={stopPropagation}
      >
        {children}
      </div>
    </div>
  );
}
