import { login } from "../../../app/login/actions";

type LoginFormProps = {
  errorMessage?: string;
};

function EnvelopeIcon() {
  return (
    <svg
      className="pointer-events-none h-5 w-5 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="pointer-events-none h-5 w-5 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

export function LoginForm({ errorMessage }: LoginFormProps) {
  return (
    <div className="font-poppins flex min-h-screen flex-col bg-white lg:flex-row">
      <section
        className="relative flex w-full flex-1 flex-col bg-[#FFFFFF] px-5 py-8 sm:px-8 lg:min-h-0 lg:w-1/2 lg:flex-none"
        aria-labelledby="login-heading"
      >
        <p className="shrink-0 text-left text-2xl font-bold tracking-tight text-[#227DE8] sm:text-[1.65rem]">
          CHAVARRIAS
        </p>

        <div className="flex flex-1 flex-col items-center justify-center py-8 lg:py-12">
          <div className="w-full max-w-md">
            <header className="mb-8 text-left">
              <h1
                id="login-heading"
                className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.75rem]"
              >
                Inicia sesión
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Ingresa tus datos para acceder
              </p>
            </header>

            <form action={login} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200">
                    <EnvelopeIcon />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
                    placeholder="tu@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-[15px] text-slate-900 shadow-none outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {errorMessage ? (
                <p
                  className="rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm leading-snug text-red-800 transition-all duration-200"
                  role="alert"
                >
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#227DE8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#227DE8]/40 focus-visible:ring-offset-2"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      </section>

      <aside
        className="relative flex min-h-[22rem] w-full flex-1 flex-col items-center justify-center overflow-hidden bg-[#227DE8] px-8 py-12 text-white sm:min-h-[26rem] lg:min-h-screen lg:w-1/2 lg:flex-none"
        aria-label="Bienvenida"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-0 transition-transform duration-500" />
          <div className="absolute -bottom-12 -left-20 h-80 w-80 rounded-full bg-white/10" />
          <div className="absolute left-1/2 top-1/4 h-40 w-40 -translate-x-1/2 rounded-full bg-white/5" />
          <div className="absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-[1.85rem] xl:text-4xl">
            Bienvenido al CRM Chavarrias
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
            Gestiona relaciones, seguimientos y resultados en un solo lugar, con un
            diseño claro y profesional.
          </p>

          <div
            className="mt-10 w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-1 shadow-sm backdrop-blur-sm transition-all duration-200"
            role="img"
            aria-label="Vista previa: imagen en preparación"
          >
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[0.9rem] bg-white/15 text-sm text-white/80">
              Imagen / captura
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
