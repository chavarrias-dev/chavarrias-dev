"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type InviteConfirmClientProps = {
  tokenHash?: string;
  otpType?: string;
};

export function InviteConfirmClient({
  tokenHash,
  otpType,
}: InviteConfirmClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createSupabaseBrowserClient();

      let hash =
        typeof tokenHash === "string" ? tokenHash.trim() : "";
      let typ =
        typeof otpType === "string" ? otpType.trim() : "";

      if (typeof window !== "undefined") {
        const q = new URLSearchParams(window.location.search);
        hash = hash || (q.get("token_hash") ?? "").trim();
        typ = typ || (q.get("type") ?? "").trim();

        const code = q.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setPhase("error");
            setMessage(error.message);
            return;
          }
          router.replace("/auth/set-password");
          return;
        }

        const frag = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        if (frag) {
          const hp = new URLSearchParams(frag);
          const access_token = hp.get("access_token");
          const refresh_token = hp.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (cancelled) return;
            if (error) {
              setPhase("error");
              setMessage(error.message);
              return;
            }
            window.history.replaceState(
              {},
              "",
              `${window.location.pathname}${window.location.search}`,
            );
            router.replace("/auth/set-password");
            return;
          }
        }
      }

      if (!hash || !typ) {
        setPhase("error");
        setMessage("Enlace incompleto o expirado. Solicita una nueva invitación.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: hash,
        type: typ as "signup" | "invite" | "recovery" | "email_change",
      });

      if (cancelled) return;
      if (error) {
        setPhase("error");
        setMessage(error.message);
        return;
      }

      if (typ === "invite") {
        router.replace("/auth/set-password");
        return;
      }

      router.replace("/dashboard");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, otpType, router]);

  return (
    <div className="font-poppins flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <p className="mb-10 text-2xl font-bold tracking-tight text-[#227DE8]">
        CHAVARRIAS
      </p>
      {phase === "loading" ? (
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-[#227DE8] border-t-transparent"
            aria-hidden
          />
          <p className="text-sm text-slate-600">Confirmando tu invitación…</p>
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-red-200/90 bg-red-50 px-5 py-4 text-center shadow-sm">
          <p className="text-sm font-medium text-red-900">
            No se pudo confirmar el enlace
          </p>
          <p className="mt-2 text-sm text-red-800">{message}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-[#227DE8] underline-offset-2 hover:underline"
          >
            Ir a iniciar sesión
          </a>
        </div>
      )}
    </div>
  );
}
