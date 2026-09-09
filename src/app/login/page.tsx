import type { Metadata } from "next";

import { Logo } from "@/components/ui/Logo";

import { login } from "./actions";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesso da equipe Fidelize ao Fidelize Admin.",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  credenciais_invalidas: "E-mail ou senha incorretos.",
  acesso_negado: "Essa conta não tem acesso ao Fidelize Admin.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Não foi possível entrar.")
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-950 px-5 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex justify-center">
          <Logo />
        </div>

        <h1 className="mt-6 text-center font-display text-xl font-bold text-brand-950">
          Fidelize Admin
        </h1>
        <p className="mt-1 text-center text-sm text-ink-muted">
          Acesso restrito à equipe Fidelize.
        </p>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
          >
            {errorMessage}
          </p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-brand-950"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-brand-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brand-950"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-brand-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
