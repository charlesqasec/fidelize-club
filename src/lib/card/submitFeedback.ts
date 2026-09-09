"use server";

import { createPublicClient } from "@/lib/supabase/publicClient";

/**
 * Envia o feedback interno (1–5 estrelas + comentário opcional) de um Web
 * Card público. Chamado pelo formulário client-side em `FeedbackCard.tsx`.
 *
 * Chama `public.submit_card_feedback(p_token, p_rating, p_comment)` —
 * function `SECURITY DEFINER` criada em
 * `supabase/migrations/20260909155027_public_web_card_functions.sql` e
 * ajustada em `20260909155236_submit_card_feedback_comment_limit.sql`
 * (ETAPA 4.0.1). Ela resolve organization_id/membership_id A PARTIR DO
 * TOKEN, internamente — nunca recebe esses ids do cliente — valida
 * rating (1–5) e tamanho do comentário (rejeita acima de 1000
 * caracteres, `reason: "comment_too_long"`) e aplica uma defesa mínima
 * contra abuso (no máximo 3 envios por cartão a cada 24h, calculada
 * sobre `customer_feedback` já existente — não substitui rate limiting
 * por IP/dispositivo numa borda real).
 */
export type SubmitFeedbackResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invalid_token"
        | "invalid_rating"
        | "comment_too_long"
        | "card_not_found"
        | "feedback_disabled"
        | "rate_limited"
        | "unavailable";
    };

const KNOWN_REASONS = new Set<string>([
  "invalid_token",
  "invalid_rating",
  "comment_too_long",
  "card_not_found",
  "feedback_disabled",
  "rate_limited",
]);

export async function submitCardFeedback(
  token: string,
  rating: number,
  comment: string,
): Promise<SubmitFeedbackResult> {
  if (
    !/^[0-9a-f]{48}$/.test(token) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return { ok: false, reason: "invalid_rating" };
  }

  const trimmedComment = comment.trim();

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("submit_card_feedback", {
      p_token: token,
      p_rating: rating,
      p_comment: trimmedComment || undefined,
    });

    if (error) {
      return { ok: false, reason: "unavailable" };
    }

    const payload = data as { ok?: boolean; reason?: string } | null;
    if (payload?.ok) {
      return { ok: true };
    }

    const reason =
      payload?.reason && KNOWN_REASONS.has(payload.reason)
        ? (payload.reason as Exclude<SubmitFeedbackResult, { ok: true }>["reason"])
        : "unavailable";
    return { ok: false, reason };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
