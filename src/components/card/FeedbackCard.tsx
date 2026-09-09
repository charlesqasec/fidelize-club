"use client";

import { useState, useTransition } from "react";

import { IconCheck, IconChat, IconStar } from "@/components/ui/Icons";
import { submitCardFeedback } from "@/lib/card/submitFeedback";

type Outcome =
  | "idle"
  | "sent"
  | "no_rating"
  | "comment_too_long"
  | "rate_limited"
  | "unavailable";

const MESSAGE: Partial<Record<Outcome, string>> = {
  no_rating: "Escolha uma nota antes de enviar.",
  comment_too_long: "Seu comentário passou de 1000 caracteres — encurte um pouco.",
  rate_limited:
    "Você já enviou feedback algumas vezes hoje. Tente novamente amanhã.",
  unavailable:
    "Não foi possível enviar agora. Tente de novo em instantes ou conte para a equipe do estabelecimento.",
};

/**
 * "Como foi sua experiência?" — feedback interno, privado, nunca publicado
 * automaticamente (docs/ARQUITETURA.md, seção 7.2-B).
 *
 * Envia para `public.submit_card_feedback` (SECURITY DEFINER, ETAPA
 * 4.0.1 — ver `src/lib/card/submitFeedback.ts`) via Server Action. A
 * function valida rating/tamanho do comentário e aplica um limite de
 * envios por cartão — os motivos de recusa viram mensagens específicas
 * abaixo, nunca um erro técnico.
 */
export function FeedbackCard({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const [pending, startTransition] = useTransition();

  if (outcome === "sent") {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm shadow-emerald-900/[0.04]">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
          <IconCheck className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-emerald-900">
          Obrigado pelo seu feedback!
        </p>
        <p className="mt-1 text-xs text-emerald-800/80">
          A equipe do estabelecimento recebeu sua avaliação.
        </p>
      </section>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setOutcome("no_rating");
      return;
    }
    startTransition(async () => {
      const result = await submitCardFeedback(token, rating, comment);
      if (result.ok) {
        setOutcome("sent");
        return;
      }
      switch (result.reason) {
        case "comment_too_long":
          setOutcome("comment_too_long");
          break;
        case "rate_limited":
          setOutcome("rate_limited");
          break;
        default:
          // invalid_token/invalid_rating não deveriam acontecer pela UI
          // normal (já validados aqui e pelo próprio token da página);
          // card_not_found/feedback_disabled também não têm ação útil
          // para o cliente além de "tente depois" — mesma mensagem
          // genérica de "unavailable".
          setOutcome("unavailable");
      }
    });
  }

  const displayRating = hoverRating || rating;
  const message = MESSAGE[outcome];

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm shadow-brand-950/[0.03] group-data-[card-style=bold]/card:shadow-md group-data-[card-style=bold]/card:shadow-brand-950/[0.06] group-data-[card-style=minimal]/card:shadow-none">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--accent)/10 text-(--accent)">
          <IconChat className="h-[1.1rem] w-[1.1rem]" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-ink">
            Como foi sua experiência?
          </h2>
          <p className="text-xs text-ink-muted">
            Sua opinião ajuda este estabelecimento a melhorar.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-label="Nota de 1 a 5"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} de 5`}
              onClick={() => {
                setRating(value);
                setOutcome("idle");
              }}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="group/star flex h-11 w-11 items-center justify-center rounded-xl text-amber-500 transition-[background-color,transform] duration-150 hover:bg-amber-50 active:scale-90"
            >
              <IconStar
                className="h-7 w-7 transition-transform duration-150 group-aria-checked/star:scale-110"
                fill={value <= displayRating ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>

        <div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Conte o que achou (opcional)"
            rows={3}
            maxLength={1000}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/25"
          />
          {comment.length > 0 ? (
            <p className="mt-1 text-right text-[0.7rem] tabular-nums text-ink-muted">
              {comment.length}/1000
            </p>
          ) : null}
        </div>

        {message ? (
          <p
            className={
              outcome === "rate_limited" || outcome === "unavailable"
                ? "text-xs text-ink-muted"
                : "text-xs text-red-700"
            }
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white shadow-md shadow-(--accent)/25 transition-[filter,transform,box-shadow] duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {pending ? "Enviando…" : "Enviar feedback"}
        </button>
      </form>
    </section>
  );
}
