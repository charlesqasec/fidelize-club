import { createPublicClient } from "@/lib/supabase/publicClient";

import type { CardLookupOutcome, PublicCardData } from "./types";

/**
 * Resolve o Web Card público a partir do `token` da URL (`/c/[token]`).
 *
 * Chama `public.get_public_card(p_token)` — function `SECURITY DEFINER`
 * criada em `supabase/migrations/20260909155027_public_web_card_functions.sql`
 * (ETAPA 4.0.1). Ela é o ÚNICO ponto de leitura pública do cartão: resolve
 * tudo (organização, programa, branding, saldo, recompensas, campanhas,
 * canal de avaliação) a partir só do `public_token`, nunca aceita
 * organization_id/customer_id do chamador, e nenhuma tabela base tem
 * policy de SELECT para `anon` — a segurança é a lógica interna da
 * function, não RLS. Ver comentário no topo daquela migration e
 * `docs/BANCO_DE_DADOS.md`, seção 5, item 3, para o raciocínio completo.
 *
 * Este arquivo nunca lança para o chamador: qualquer erro de rede/infra
 * vira `{ status: "unavailable" }`, nunca expõe detalhe técnico do
 * Postgres/PostgREST ao consumidor.
 */

/**
 * `customer_cards.public_token` é `encode(gen_random_bytes(24), 'hex')` —
 * sempre exatamente 48 caracteres hexadecimais minúsculos. Checado aqui
 * de novo como defesa em profundidade (a function no banco também
 * valida) — evita gastar um round-trip de rede com lixo óbvio.
 */
const PUBLIC_TOKEN_FORMAT = /^[0-9a-f]{48}$/;

export async function getPublicCardByToken(
  token: string,
): Promise<CardLookupOutcome> {
  if (!PUBLIC_TOKEN_FORMAT.test(token)) {
    return { status: "not_found" };
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("get_public_card", {
      p_token: token,
    });

    if (error) {
      return { status: "unavailable" };
    }

    return mapRpcResult(data);
  } catch {
    return { status: "unavailable" };
  }
}

/** Traduz o JSON devolvido pela function para `CardLookupOutcome`. */
function mapRpcResult(data: unknown): CardLookupOutcome {
  if (!data || typeof data !== "object") {
    return { status: "not_found" };
  }

  const payload = data as {
    outcome?: string;
    card?: PublicCardData;
    organizationName?: unknown;
  };

  const organizationName =
    typeof payload.organizationName === "string"
      ? payload.organizationName
      : undefined;

  switch (payload.outcome) {
    case "card_inactive":
      return { status: "card_inactive", organizationName };
    case "program_inactive":
      return { status: "program_inactive", organizationName };
    case "ok":
      if (!payload.card) return { status: "not_found" };
      // A function devolve `card` já no formato `PublicCardData` exato —
      // nenhuma transformação adicional acontece no cliente.
      return { status: "ok", card: payload.card };
    default:
      return { status: "not_found" };
  }
}
