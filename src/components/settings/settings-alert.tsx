type SettingsAlertProps = {
  tone: "success" | "error";
  message: string;
};

export function SettingsAlert({ tone, message }: SettingsAlertProps) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <p className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`} role="status">
      {message}
    </p>
  );
}
