"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { SettingsAlert } from "@/components/settings/settings-alert";
import { SettingsCard } from "@/components/settings/settings-card";

type ProfileSectionProps = {
  initialFullName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

export function ProfileSection({
  initialFullName,
  initialEmail,
  initialAvatarUrl,
}: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  function handleAvatarPick(file: File | undefined) {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("full_name", fullName);
      formData.set("email", email);
      if (avatarFile) {
        formData.set("avatar", avatarFile);
      }

      const response = await fetch("/api/settings/profile", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        avatar_url?: string;
        email_change_requested?: boolean;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el perfil");
      }

      if (payload.avatar_url) {
        setAvatarUrl(payload.avatar_url);
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      setMessage({
        tone: "success",
        text: payload.email_change_requested
          ? "Perfil actualizado. Revisa tu correo para confirmar el nuevo email."
          : "Perfil actualizado correctamente.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo guardar el perfil",
      });
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <SettingsCard title="Mi Perfil" description="Datos personales y foto de tu cuenta.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#227DE8]/15 text-lg font-semibold text-[#227DE8] ring-2 ring-[#227DE8]/10"
          >
            {displayAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatar}
                alt="Foto de perfil"
                className="size-full object-cover"
              />
            ) : (
              initialsFromName(fullName || email)
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition-all duration-200 group-hover:bg-slate-900/40 group-hover:opacity-100">
              <Camera className="size-5" aria-hidden />
            </span>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-[#227DE8] hover:underline"
            >
              Cambiar foto
            </button>
            <p className="mt-0.5 text-xs text-slate-500">JPG, PNG, WEBP o GIF.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleAvatarPick(e.target.files?.[0])}
            />
          </div>
        </div>

        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Nombre completo
          </label>
          <input
            id="full_name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        {message ? <SettingsAlert tone={message.tone} message={message.text} /> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Guardar cambios
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
