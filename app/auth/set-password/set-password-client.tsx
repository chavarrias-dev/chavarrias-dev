"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

export function SetPasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      setSessionReady(true);
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.trim().length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updErr } = await supabase.auth.updateUser({
      password: password.trim(),
    });
    setPending(false);

    if (updErr) {
      setError(updErr.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  if (!sessionReady) {
    return (
      <div className="font-poppins flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
        <p className="mb-10 text-2xl font-bold tracking-tight text-[#227DE8]">
          CHAVARRIAS
        </p>
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-[#227DE8] border-t-transparent"
            aria-hidden
          />
          <p className="text-sm text-slate-600">Comprobando sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-poppins flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <p className="mb-10 text-2xl font-bold tracking-tight text-[#227DE8]">
        CHAVARRIAS
      </p>

      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-sm">
        <header className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">
            Establecer contraseña
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Elige una contraseña segura para tu cuenta.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Nueva contraseña <span className="text-red-600">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirmar contraseña <span className="text-red-600">*</span>
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              className={inputClass}
              placeholder="Repite la contraseña"
            />
          </div>

          {error ? (
            <p
              className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#227DE8]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-75"
          >
            {pending ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
            ) : null}
            Guardar y continuar
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-[#227DE8] underline-offset-2 hover:underline"
          >
            Ir a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
