"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function DodaDesktopTable({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

export function DodaMobileStack({ children }: { children: ReactNode }) {
  return <div className="space-y-2 px-3 pb-3 md:hidden">{children}</div>;
}

type DodaMobileGroupProps = {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function DodaMobileGroup({
  label,
  count,
  collapsed,
  onToggle,
  children,
}: DodaMobileGroupProps) {
  return (
    <div className="pt-2 first:pt-0">
      <button
        type="button"
        onClick={onToggle}
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-sm font-medium text-slate-800">
          {label}
          <span className="ml-1.5 text-xs font-normal text-slate-500">
            ({count})
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
          aria-hidden
        />
      </button>
      {!collapsed ? <div className="space-y-2">{children}</div> : null}
    </div>
  );
}

type DodaMobileCardProps = {
  children: ReactNode;
  id?: string;
  accentClass?: string;
};

export function DodaMobileCard({
  children,
  id,
  accentClass = "border-l-4 border-slate-200 bg-white",
}: DodaMobileCardProps) {
  return (
    <article
      id={id}
      className={`rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm ${accentClass}`}
    >
      {children}
    </article>
  );
}

export function DodaMobileCardTitle({ children }: { children: ReactNode }) {
  return (
    <p className="break-all text-sm font-semibold leading-snug text-slate-900">
      {children}
    </p>
  );
}

export function DodaMobileKv({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-2 gap-y-0.5 py-0.5 text-xs leading-snug">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-800">{children}</span>
    </div>
  );
}

export function DodaMobileActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
      {children}
    </div>
  );
}
