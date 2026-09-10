"use server";

import { redirect } from "next/navigation";

import { createPublicClient } from "@/lib/supabase/publicClient";

import type { EnrollResult } from "./types";

/**
 * Inscreve um visitante num programa a partir do `token` da URL
 * (`/join/[token]`) e dos dados que ele digitou. Chamado pelo formulário
 * client-side em `JoinCard.tsx` via `startTransition`.
 *
 * Chama `public.enroll_customer(...)` — function `SECURITY DEFINER`
 * (ETAPA 5.0B, `20260910134846_public_enrollment_rpcs.sql`). Ela é o
 * ÚNICO ponto de escrita: resolve organização/programa SÓ pelo token,
 * deduplica por (organização, telefone), é idempotente e nunca mexe em
 * saldo. Aqui apenas repetimos a validação básica de entrada (nome/
 * telefone/e-mail) antes do round-trip — a autoridade é a function.
 *
 * Sucesso → `redirect("/c/<cardToken>")` (client-side navigation numa
 * Server Action). `alreadyEnrolled` cai no mesmo redirect. `redirect`
 * lança, então fica FORA do try/catch (guia do Next.js 16).
 */

const REASONS = new Set([
  "invalid_link",
  "link_unavailable",
  "invalid_name",
  "invalid_phone",
  "invalid_email",
  "rate_limited",
  "unavailable",
]);

export type EnrollInput = {
  token: string;
  name: string;
  phone: string;
  email: string;
  optInWhatsapp: boolean;
  optInEmail: boolean;
};

export async function enrollInProgram(input: EnrollInput): Promise<EnrollResult> {
  const token = typeof input?.token === "string" ? input.token.trim() : "";
  if (!/^[A-Za-z0-9._-]{16,128}$/.test(token)) {
    return { ok: false, reason: "invalid_link" };
  }

  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 400 || /[\p{Cc}]/u.test(name)) {
    return { ok: false, reason: "invalid_name" };
  }

  const phoneRaw = String(input?.phone ?? "");
  if (phoneRaw.replace(/\D/g, "").length < 10) {
    return { ok: false, reason: "invalid_phone" };
  }

  const email = String(input?.email ?? "").trim();
  if (email !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, reason: "invalid_email" };
  }

  let outcome: EnrollResult;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("enroll_customer", {
      p_token: token,
      p_name: name,
      p_phone: phoneRaw,
      p_email: email || undefined,
      p_opt_in_whatsapp: Boolean(input?.optInWhatsapp),
      p_opt_in_email: Boolean(input?.optInEmail),
    });

    if (error) {
      return { ok: false, reason: "network" };
    }

    const payload = data as {
      ok?: boolean;
      cardToken?: string | null;
      alreadyEnrolled?: boolean;
      reason?: string;
    } | null;

    if (payload?.ok && typeof payload.cardToken === "string" && payload.cardToken) {
      outcome = {
        ok: true,
        cardToken: payload.cardToken,
        alreadyEnrolled: Boolean(payload.alreadyEnrolled),
      };
    } else {
      const reason =
        payload?.reason && REASONS.has(payload.reason)
          ? (payload.reason as Exclude<EnrollResult, { ok: true }>["reason"])
          : "network";
      outcome = { ok: false, reason };
    }
  } catch {
    return { ok: false, reason: "network" };
  }

  if (outcome.ok) {
    // Fora do try/catch: `redirect` lança `NEXT_REDIRECT`.
    redirect(`/c/${outcome.cardToken}`);
  }

  return outcome;
}
