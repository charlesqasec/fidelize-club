"use client";

import { useState } from "react";

import { IconUserPlus } from "@/components/ui/Icons";

/**
 * Tela de entrada para quem ainda não tem cartão — seção 9 da ETAPA 4.0.
 *
 * ============================================================================
 * NÃO ESTÁ LIGADA A NENHUMA ROTA DE PRODUÇÃO. Leia antes de conectar.
 * ============================================================================
 * `/c/[token]` só resolve `customer_cards.public_token` (o cartão de quem
 * JÁ é cliente) — é o único mecanismo de token público que o schema atual
 * sanciona (docs/BANCO_DE_DADOS.md, seção 5, item 3). Não existe, no
 * schema de hoje, um token público de "entrada"/inscrição que aponte para
 * um estabelecimento ou programa: `qr_tokens`/`nfc_devices` são segredos
 * de check-in, restritos a `platform_admin`, sem policy pública, e
 * modelados para gerar `checkin_events` (ETAPA 6/10) — não para
 * apresentar "cadastre-se na Barbearia X" a um visitante anônimo.
 *
 * Conectar este componente a uma URL de verdade sem essa peça faltando
 * significaria adivinhar a organização a partir de um token não
 * verificado — o tipo de improviso que a instrução desta etapa pede para
 * reportar, não construir. Ver o relatório final para a proposta completa
 * (um token público de programa + function `enroll_customer`).
 *
 * Por isso este componente é PURAMENTE apresentacional: recebe os dados
 * do estabelecimento e um `onSubmit` via props, em vez de resolver
 * qualquer coisa sozinho. É assim que fica pronto para ligar no dia em
 * que esse mecanismo existir, sem reescrita.
 * ============================================================================
 */
export function SignupCard({
  organizationName,
  programName,
  headline,
  onSubmit,
}: {
  organizationName: string;
  programName: string;
  headline?: string | null;
  onSubmit: (data: {
    name: string;
    contact: string;
    consent: boolean;
  }) => Promise<{ ok: boolean }>;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-display text-base font-semibold text-emerald-900">
          Cadastro recebido!
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          Seu Web Card vai aparecer aqui assim que a equipe confirmar.
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !contact.trim()) {
      setError("Preencha nome e um contato.");
      return;
    }
    if (!consent) {
      setError("Confirme que pode ser contatado por este estabelecimento.");
      return;
    }
    setSubmitting(true);
    const result = await onSubmit({ name: name.trim(), contact: contact.trim(), consent });
    setSubmitting(false);
    if (result.ok) setDone(true);
    else setError("Não foi possível concluir o cadastro agora.");
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm shadow-brand-950/[0.03]">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <IconUserPlus className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
        {organizationName}
      </p>
      <h1 className="mt-1 font-display text-xl font-bold text-brand-950">
        {programName}
      </h1>
      {headline ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{headline}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-brand-950">
            Nome
          </label>
          <input
            id="signup-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-brand-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label htmlFor="signup-contact" className="block text-sm font-medium text-brand-950">
            E-mail ou telefone
          </label>
          <input
            id="signup-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-brand-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <label className="flex items-start gap-2.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-500"
          />
          Autorizo {organizationName} a me contatar sobre este programa de
          fidelidade.
        </label>

        {error ? <p className="text-xs text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando…" : "Quero participar"}
        </button>
      </form>
    </div>
  );
}
