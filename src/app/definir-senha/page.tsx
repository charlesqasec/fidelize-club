"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import {
  FormFeedback,
  PrimaryButton,
  inputClass,
} from "@/components/admin/formKit";

/**
 * Página pública de definição de senha — ETAPA 4.6D. Destino do link de
 * convite (`auth.admin.inviteUserByEmail(email, { redirectTo:
 * ".../definir-senha" })`, `src/lib/admin/team-panel/actions.ts`).
 *
 * O link traz o token na fragment da URL (`#access_token=...`), que nunca
 * chega ao servidor (fragments não são enviados em requisições HTTP) — só o
 * client do navegador o processa. O client Supabase de
 * `src/lib/supabase/client.ts` troca esse token por uma sessão temporária
 * sozinho ao carregar a página (`detectSessionInUrl`, padrão do
 * `@supabase/ssr`/`supabase-js`). Esta página só espera essa sessão existir
 * e chama `supabase.auth.updateUser({ password })` — nunca lê, gera nem
 * armazena senha em nenhum outro lugar do app.
 */
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setPending(false);

    if (updateError) {
      setError("Não foi possível definir a senha. Tente novamente.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/admin"), 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-950 px-5 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex justify-center">
          <Logo />
        </div>

        <h1 className="mt-6 text-center font-display text-xl font-bold text-brand-950">
          Definir senha
        </h1>
        <p className="mt-1 text-center text-sm text-ink-muted">
          Escolha a senha de acesso ao Fidelize Admin.
        </p>

        {checking ? (
          <p className="mt-6 text-center text-sm text-ink-muted">
            Verificando convite…
          </p>
        ) : !hasSession ? (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
          >
            Link inválido ou expirado. Peça um novo convite a quem administra
            seu estabelecimento.
          </p>
        ) : success ? (
          <p
            role="status"
            className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200"
          >
            Senha definida. Redirecionando…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-brand-950"
              >
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={pending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-brand-950"
              >
                Confirmar senha
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={pending}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <PrimaryButton disabled={pending}>
              {pending ? "Salvando…" : "Salvar senha e entrar"}
            </PrimaryButton>

            <FormFeedback error={error} />
          </form>
        )}
      </div>
    </main>
  );
}
