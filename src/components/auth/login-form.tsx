"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "../../../app/login/actions";

type LoginFormProps = {
  errorMessage?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20 disabled:opacity-60";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#1a6ed4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#227DE8]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-75"
    >
      {pending ? (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      ) : null}
      Entrar
    </button>
  );
}

function LoginFields() {
  const { pending } = useFormStatus();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={pending}
          className={inputClass}
          placeholder="tu@empresa.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            disabled={pending}
            className={`${inputClass} pr-11`}
            placeholder="••••••••"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#227DE8]/30 disabled:pointer-events-none"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export function LoginForm({ errorMessage }: LoginFormProps) {
  return (
    <div className="relative min-h-screen bg-white font-poppins">
      <img
        src="/chavarrias_logo.svg"
        alt="Chavarrias"
        className="absolute left-6 top-6 z-10 h-10 w-auto"
      />

      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-20 sm:px-8">
        <div className="w-full max-w-[420px]">
          <header className="mb-10 text-center sm:mb-12">
            <h1
              id="login-heading"
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]"
            >
              Iniciar sesión
            </h1>
            <p className="mt-3 text-base text-slate-500">
              Bienvenido de nuevo <span aria-hidden>👋</span>
            </p>
          </header>

          <form action={login} className="space-y-6">
            <LoginFields />

            {errorMessage ? (
              <p
                className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm leading-snug text-red-800"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <SubmitButton />
          </form>
        </div>
      </main>
    </div>
  );
}
