"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useState, useTransition } from "react";

import { BrandMark } from "@/components/card/BrandMark";
import { CardFooter } from "@/components/card/CardFooter";
import { IconUserPlus } from "@/components/ui/Icons";
import { enrollInProgram } from "@/lib/enroll/enrollAction";
import type { EnrollResult, ProgramEntry } from "@/lib/enroll/types";

/**
 * Tela de cadastro público de um programa (`/join/[token]`, ETAPA 5.0C).
 *
 * Segue a linguagem visual do Web Card: um "cartão" colorido com a marca
 * do estabelecimento no topo (mesmo `BrandMark`, mesmo gradiente de
 * branding com fallback roxo Fidelize) e um formulário branco logo abaixo.
 *
 * O visitante ainda NÃO é cliente — nada aqui resolve organização/programa
 * por conta própria: tudo vem de `get_program_entry` (via props) e o envio
 * vai para `enroll_customer` (server action `enrollInProgram`), que em
 * sucesso redireciona para `/c/[cardToken]`.
 */

const FIDELIZE_PRIMARY = "#6d3ce0";
const FIDELIZE_SECONDARY = "#1e0b47";
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Só `#rgb`/`#rrggbb` — nunca uma string arbitrária vinda do banco no CSS. */
function safeColor(value: string | null): string | null {
  const raw = value?.trim();
  return raw && HEX.test(raw) ? raw : null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type FieldErrors = { name?: string; phone?: string; email?: string };

const REASON_MESSAGE: Partial<Record<
  Exclude<EnrollResult, { ok: true }>["reason"],
  string
>> = {
  invalid_name: "Confira o nome informado.",
  invalid_phone: "Confira o número de WhatsApp.",
  invalid_email: "Confira o e-mail informado.",
  rate_limited:
    "Recebemos muitas inscrições agora há pouco. Aguarde alguns instantes e tente de novo.",
  unavailable:
    "Não foi possível concluir sua entrada neste programa. Fale com a equipe do estabelecimento.",
  invalid_link: "Este link não está mais disponível.",
  link_unavailable: "Este link não está mais disponível.",
  network:
    "Não foi possível concluir agora. Verifique sua conexão e tente novamente em instantes.",
};

export function JoinCard({
  token,
  entry,
}: {
  token: string;
  entry: ProgramEntry;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [accept, setAccept] = useState(false);
  const [optInWhatsapp, setOptInWhatsapp] = useState(false);
  const [optInEmail, setOptInEmail] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const branding = entry.branding;
  const primary = safeColor(branding?.primaryColor ?? null) ?? FIDELIZE_PRIMARY;
  const secondary =
    safeColor(branding?.secondaryColor ?? null) ?? FIDELIZE_SECONDARY;
  const background =
    safeColor(branding?.backgroundColor ?? null) ??
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const text = safeColor(branding?.textColor ?? null) ?? "#ffffff";

  const heroStyle = { background, "--card-text": text } as CSSProperties;
  const headline = branding?.headline?.trim();
  const description = branding?.description?.trim();

  function validate(): boolean {
    const next: FieldErrors = {};
    if (name.replace(/\s+/g, " ").trim().length < 2) {
      next.name = "Informe seu nome.";
    }
    if (phone.replace(/\D/g, "").length < 10) {
      next.phone = "Informe um WhatsApp válido com DDD.";
    }
    if (email.trim() !== "" && !EMAIL_RE.test(email.trim())) {
      next.email = "E-mail em formato inválido.";
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return false;
    if (!accept) {
      setFormError("Confirme o aceite para entrar no programa.");
      return false;
    }
    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    startTransition(async () => {
      const result = await enrollInProgram({
        token,
        name,
        phone,
        email,
        optInWhatsapp,
        optInEmail,
      });
      // Em sucesso a server action redireciona (não retorna). Se retornar
      // mesmo assim, garante a navegação pelo cliente.
      if (result.ok) {
        router.replace(`/c/${result.cardToken}`);
        return;
      }
      if (result.reason === "invalid_name") {
        setFieldErrors((p) => ({ ...p, name: "Confira o nome informado." }));
      } else if (result.reason === "invalid_phone") {
        setFieldErrors((p) => ({ ...p, phone: "Confira o número de WhatsApp." }));
      } else if (result.reason === "invalid_email") {
        setFieldErrors((p) => ({ ...p, email: "Confira o e-mail informado." }));
      }
      setFormError(REASON_MESSAGE[result.reason] ?? REASON_MESSAGE.network!);
    });
  }

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-line px-3.5 py-3 text-base text-brand-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5 sm:px-5 sm:pt-7">
        {/* Cartão de marca do estabelecimento — mesma linguagem do Web Card */}
        <section
          className="relative overflow-hidden rounded-3xl p-5 shadow-xl shadow-brand-950/25 ring-1 ring-black/5 sm:p-6"
          style={heroStyle}
          aria-label={`Programa de ${entry.organization.name}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[color:var(--card-text)]/10 blur-2xl"
          />
          <div className="relative flex items-center gap-3">
            <BrandMark
              name={entry.organization.name}
              logoUrl={branding?.logoUrl ?? null}
            />
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--card-text)]/65">
                Programa de fidelidade
              </p>
              <h1 className="mt-0.5 truncate font-display text-xl font-bold leading-tight text-[color:var(--card-text)]">
                {entry.organization.name}
              </h1>
            </div>
          </div>
          <p className="relative mt-3 text-sm font-semibold text-[color:var(--card-text)]/85">
            {entry.program.name}
          </p>
          {headline ? (
            <p className="relative mt-2 font-display text-[0.95rem] font-semibold leading-snug text-[color:var(--card-text)]">
              {headline}
            </p>
          ) : null}
          {description ? (
            <p className="relative mt-1 text-[0.8rem] leading-relaxed text-[color:var(--card-text)]/75">
              {description}
            </p>
          ) : null}
        </section>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-3 rounded-3xl border border-line bg-white p-5 shadow-sm shadow-brand-950/[0.03] sm:p-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconUserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink">
                Entre no programa
              </h2>
              <p className="text-xs text-ink-muted">
                Leva menos de um minuto.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="join-name"
                className="block text-sm font-medium text-brand-950"
              >
                Nome
              </label>
              <input
                id="join-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={fieldErrors.name ? true : undefined}
                className={inputClass}
              />
              {fieldErrors.name ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="join-phone"
                className="block text-sm font-medium text-brand-950"
              >
                WhatsApp
              </label>
              <input
                id="join-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={fieldErrors.phone ? true : undefined}
                className={inputClass}
              />
              {fieldErrors.phone ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.phone}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="join-email"
                className="block text-sm font-medium text-brand-950"
              >
                E-mail{" "}
                <span className="font-normal text-ink-muted">(opcional)</span>
              </label>
              <input
                id="join-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldErrors.email ? true : undefined}
                className={inputClass}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                aria-invalid={Boolean(formError && !accept) || undefined}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand-600 focus:ring-brand-500"
              />
              <span>
                Concordo em participar deste programa e com o tratamento dos
                meus dados para essa finalidade, conforme a{" "}
                <Link
                  href="/privacidade"
                  target="_blank"
                  className="font-medium text-brand-700 underline"
                >
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            {entry.consent.marketingWhatsappAvailable ? (
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
                <input
                  type="checkbox"
                  checked={optInWhatsapp}
                  onChange={(e) => setOptInWhatsapp(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                Quero receber novidades e ofertas por WhatsApp.
              </label>
            ) : null}

            {entry.consent.marketingEmailAvailable ? (
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
                <input
                  type="checkbox"
                  checked={optInEmail}
                  onChange={(e) => setOptInEmail(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                Quero receber novidades e ofertas por e-mail.
              </label>
            ) : null}
          </div>

          {formError ? (
            <p className="mt-4 text-xs text-red-700" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-5 w-full rounded-full bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar no programa"}
          </button>
        </form>
      </div>

      <CardFooter />
    </div>
  );
}
