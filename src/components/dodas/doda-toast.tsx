"use client";

export type DodaToastTone = "success" | "neutral" | "error";

const TONE_CLASSES: Record<DodaToastTone, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  error: "border-red-200 bg-red-50 text-red-800",
};

export function DodaToast({
  tone,
  message,
}: {
  tone: DodaToastTone;
  message: string;
}) {
  return (
    <div
      role="status"
      className={`animate-card-in fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${TONE_CLASSES[tone]}`}
    >
      {message}
    </div>
  );
}
