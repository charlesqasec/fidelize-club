"use server";

import { type AdminActionResult, fail, guard, interpret } from "@/lib/admin/rpc";

/**
 * Server Actions de escrita de CAMPANHAS do painel do estabelecimento.
 * ETAPA 4.6F. Mesmo padrão dos demais blocos: `guard` resolve sessão +
 * acesso à organização, a escrita é delegada a uma RPC `admin_*` SECURITY
 * DEFINER (`20260912151500_campaigns_admin_rpcs.sql`) — autoridade final
 * de RBAC (OWNER/PLATFORM_ADMIN), do limite de 5 campanhas ativas e de
 * `audit_logs` — e `interpret` revalida a rota de campanhas em sucesso.
 * Só cobre campanhas type=STANDARD; nenhuma tabela base recebe policy de
 * escrita; nunca `service_role` aqui.
 */

const CAMPAIGNS_PATH = (organizationId: string) =>
  `/admin/org/${organizationId}/campanhas`;

function nullableIso(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function createCampaign(input: {
  organizationId: string;
  name: string;
  programId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;

  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) return fail("invalid_name");

  const { data, error } = await g.supabase.rpc("admin_create_campaign", {
    p_organization_id: input.organizationId,
    p_name: name,
    p_program_id: input.programId || undefined,
    p_start_at: nullableIso(input.startAt),
    p_end_at: nullableIso(input.endAt),
  });
  return interpret(data, error, [CAMPAIGNS_PATH(input.organizationId)]);
}

export async function updateCampaign(input: {
  organizationId: string;
  campaignId: string;
  name?: string;
  programId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.campaignId !== "string" || !input.campaignId) {
    return fail("not_found");
  }

  const name =
    input?.name === undefined
      ? undefined
      : String(input.name).replace(/\s+/g, " ").trim();
  if (name !== undefined && name.length < 2) return fail("invalid_name");

  const { data, error } = await g.supabase.rpc("admin_update_campaign", {
    p_campaign_id: input.campaignId,
    p_name: name,
    p_program_id: input.programId || undefined,
    p_clear_program: input.programId === null,
    p_start_at: nullableIso(input.startAt),
    p_end_at: nullableIso(input.endAt),
  });
  return interpret(data, error, [CAMPAIGNS_PATH(input.organizationId)]);
}

export async function setCampaignStatus(input: {
  organizationId: string;
  campaignId: string;
  status: "ACTIVE" | "PAUSED";
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.campaignId !== "string" || !input.campaignId) {
    return fail("not_found");
  }
  if (input?.status !== "ACTIVE" && input?.status !== "PAUSED") {
    return fail("invalid_status");
  }

  const { data, error } = await g.supabase.rpc("admin_set_campaign_status", {
    p_campaign_id: input.campaignId,
    p_status: input.status,
  });
  return interpret(data, error, [CAMPAIGNS_PATH(input.organizationId)]);
}
