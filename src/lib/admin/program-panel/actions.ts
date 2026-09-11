"use server";

import { type AdminActionResult, fail, guard, interpret } from "@/lib/admin/rpc";

/**
 * Server Actions de escrita do PAINEL DO ESTABELECIMENTO — Programa,
 * Branding e Recompensas. ETAPA 4.6C.
 *
 * Mesmo padrão do bloco 1 (`org-settings/actions.ts`): `guard` resolve
 * sessão + acesso à organização, a escrita é delegada a uma RPC `admin_*`
 * SECURITY DEFINER (`20260911120000_program_branding_rewards_admin_rpcs.sql`)
 * — autoridade final de RBAC, validação e `audit_logs` — e `interpret`
 * revalida a rota de programa em sucesso. Nenhuma tabela base recebe
 * policy de escrita; nunca `service_role` aqui.
 */

const PROGRAM_PATH = (organizationId: string) =>
  `/admin/org/${organizationId}/programa`;

// ---------------------------------------------------------------------------
// Programa — nome, status, rules (whitelist por tipo). `type` é imutável e
// nunca é parâmetro aqui.
// ---------------------------------------------------------------------------
export async function updateProgram(input: {
  organizationId: string;
  programId: string;
  name?: string;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  rules?: Record<string, number>;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.programId !== "string" || !input.programId) {
    return fail("not_found");
  }

  const name =
    input?.name === undefined
      ? undefined
      : String(input.name).replace(/\s+/g, " ").trim();
  if (name !== undefined && name.length < 2) return fail("invalid_name");

  const { data, error } = await g.supabase.rpc("admin_update_program", {
    p_program_id: input.programId,
    p_name: name,
    p_status: input?.status,
    p_rules: input?.rules,
  });
  return interpret(data, error, [PROGRAM_PATH(input.organizationId)]);
}

// ---------------------------------------------------------------------------
// Branding — formulário único, envia sempre o conjunto completo.
// ---------------------------------------------------------------------------
export async function upsertProgramBranding(input: {
  organizationId: string;
  programId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  cardStyle?: "CLASSIC" | "MINIMAL" | "BOLD";
  headline?: string | null;
  description?: string | null;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.programId !== "string" || !input.programId) {
    return fail("not_found");
  }

  const { data, error } = await g.supabase.rpc("admin_upsert_program_branding", {
    p_program_id: input.programId,
    p_logo_url: nullableString(input.logoUrl),
    p_primary_color: nullableString(input.primaryColor),
    p_secondary_color: nullableString(input.secondaryColor),
    p_background_color: nullableString(input.backgroundColor),
    p_text_color: nullableString(input.textColor),
    p_card_style: input.cardStyle ?? "CLASSIC",
    p_headline: nullableString(input.headline),
    p_description: nullableString(input.description),
  });
  return interpret(data, error, [PROGRAM_PATH(input.organizationId)]);
}

// ---------------------------------------------------------------------------
// Recompensas
// ---------------------------------------------------------------------------
export async function createReward(input: {
  organizationId: string;
  programId: string;
  name: string;
  description?: string | null;
  rewardType: "FREE_ITEM" | "DISCOUNT" | "CASHBACK" | "CUSTOM";
  threshold?: number;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.programId !== "string" || !input.programId) {
    return fail("not_found");
  }

  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) return fail("invalid_name");

  const threshold = Number.isFinite(input?.threshold) ? Number(input.threshold) : 0;
  if (threshold < 0) return fail("invalid_threshold");

  const { data, error } = await g.supabase.rpc("admin_create_reward", {
    p_program_id: input.programId,
    p_name: name,
    p_reward_type: input.rewardType,
    p_description: nullableString(input.description),
    p_threshold: threshold,
  });
  return interpret(data, error, [PROGRAM_PATH(input.organizationId)]);
}

export async function updateReward(input: {
  organizationId: string;
  rewardId: string;
  name?: string;
  description?: string | null;
  rewardType?: "FREE_ITEM" | "DISCOUNT" | "CASHBACK" | "CUSTOM";
  threshold?: number;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.rewardId !== "string" || !input.rewardId) {
    return fail("not_found");
  }

  const name =
    input?.name === undefined
      ? undefined
      : String(input.name).replace(/\s+/g, " ").trim();
  if (name !== undefined && name.length < 2) return fail("invalid_name");

  const threshold =
    input?.threshold === undefined ? undefined : Number(input.threshold);
  if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0)) {
    return fail("invalid_threshold");
  }

  const { data, error } = await g.supabase.rpc("admin_update_reward", {
    p_reward_id: input.rewardId,
    p_name: name,
    p_description:
      input?.description === undefined ? undefined : nullableString(input.description) ?? "",
    p_reward_type: input?.rewardType,
    p_threshold: threshold,
  });
  return interpret(data, error, [PROGRAM_PATH(input.organizationId)]);
}

export async function setRewardStatus(input: {
  organizationId: string;
  rewardId: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.rewardId !== "string" || !input.rewardId) {
    return fail("not_found");
  }
  if (!["ACTIVE", "PAUSED", "ARCHIVED"].includes(input?.status)) {
    return fail("invalid_status");
  }

  const { data, error } = await g.supabase.rpc("admin_set_reward_status", {
    p_reward_id: input.rewardId,
    p_status: input.status,
  });
  return interpret(data, error, [PROGRAM_PATH(input.organizationId)]);
}

/**
 * String vinda de formulário: vazia/só espaço vira `undefined` — a chave
 * some do JSON enviado à RPC, que usa seu próprio `default null` (mesmo
 * resultado em Postgres, sem conflitar com o tipo gerado `string | undefined`
 * dos Args).
 */
function nullableString(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
