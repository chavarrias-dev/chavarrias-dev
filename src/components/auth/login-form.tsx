type LoginFormProps = {
  errorMessage?: string;
  action: (formData: FormData) => Promise<void>;
};

export function LoginForm({ errorMessage, action }: LoginFormProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <header className="mb-8 text-center">
          <p className="text-3xl font-bold tracking-wide text-[#227DE8]">CHAVARRIAS</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Inicia sesion</h1>
          <p className="mt-2 text-sm text-slate-500">
            Ingresa tu correo y contrasena para acceder.
          </p>
        </header>

        <form action={action} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Correo electronico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
              placeholder="tu@empresa.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
              placeholder="••••••••"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#227DE8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d6bc9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#227DE8]/40"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
