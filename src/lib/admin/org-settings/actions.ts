"use server";

import { type AdminActionResult, fail, guard, interpret } from "@/lib/admin/rpc";

/**
 * Server Actions de escrita do PAINEL DO ESTABELECIMENTO — bloco 1
 * (organização, feature flags e unidades). ETAPA 4.6B.
 *
 * Cada ação:
 *  1. resolve a sessão e revalida o acesso à organização (`guard`,
 *     `@/lib/admin/rpc`) — porta fechada mesmo sem UI;
 *  2. delega a ESCRITA para uma RPC `admin_*` `SECURITY DEFINER`
 *     (`20260910150000_establishment_panel_admin_rpcs.sql`), que é a
 *     autoridade final de RBAC: valida `auth.uid()`, `organization_id` e
 *     papel dentro da operação, e registra `audit_logs`. Nenhuma tabela base
 *     recebe policy de escrita; nunca `service_role` aqui;
 *  3. em sucesso, `revalidatePath` da rota de configurações — o Server
 *     Component re-renderiza com os dados frescos no mesmo round-trip.
 *
 * O retorno é sempre estreito (`AdminActionResult`) — nunca a linha crua do
 * banco.
 */

export type { AdminActionResult };

// ---------------------------------------------------------------------------
// Organização
// ---------------------------------------------------------------------------
export async function updateOrganizationName(input: {
  organizationId: string;
  name: string;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;

  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 200) return fail("invalid_name");

  const { data, error } = await g.supabase.rpc("admin_update_organization", {
    p_organization_id: input.organizationId,
    p_name: name,
  });
  return interpret(data, error, [`/admin/org/${input.organizationId}/configuracoes`]);
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------
export type FeatureFlagInput = {
  organizationId: string;
  reviews_enabled?: boolean;
  internal_feedback_enabled?: boolean;
  web_push_enabled?: boolean;
  google_wallet_enabled?: boolean;
  apple_wallet_enabled?: boolean;
};

export async function updateFeatureFlags(
  input: FeatureFlagInput,
): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;

  const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

  const { data, error } = await g.supabase.rpc("admin_update_feature_flags", {
    p_organization_id: input.organizationId,
    p_reviews_enabled: bool(input.reviews_enabled),
    p_internal_feedback_enabled: bool(input.internal_feedback_enabled),
    p_web_push_enabled: bool(input.web_push_enabled),
    p_google_wallet_enabled: bool(input.google_wallet_enabled),
    p_apple_wallet_enabled: bool(input.apple_wallet_enabled),
  });
  return interpret(data, error, [`/admin/org/${input.organizationId}/configuracoes`]);
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------
export async function createLocation(input: {
  organizationId: string;
  name: string;
  slug: string;
  address?: Record<string, string> | null;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;

  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim();
  const slug = String(input?.slug ?? "").trim().toLowerCase();
  if (name.length < 2) return fail("invalid_name");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return fail("invalid_slug");
  }

  const { data, error } = await g.supabase.rpc("admin_create_location", {
    p_organization_id: input.organizationId,
    p_name: name,
    p_slug: slug,
    p_address: cleanAddress(input?.address),
  });
  return interpret(data, error, [`/admin/org/${input.organizationId}/configuracoes`]);
}

export async function updateLocation(input: {
  organizationId: string;
  locationId: string;
  name?: string;
  slug?: string;
  address?: Record<string, string> | null;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.locationId !== "string" || !input.locationId) {
    return fail("not_found");
  }

  const name =
    input?.name === undefined
      ? undefined
      : String(input.name).replace(/\s+/g, " ").trim();
  const slug =
    input?.slug === undefined ? undefined : String(input.slug).trim().toLowerCase();
  if (name !== undefined && name.length < 2) return fail("invalid_name");
  if (
    slug !== undefined &&
    (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60)
  ) {
    return fail("invalid_slug");
  }

  const { data, error } = await g.supabase.rpc("admin_update_location", {
    p_location_id: input.locationId,
    p_name: name,
    p_slug: slug,
    p_address:
      input?.address === undefined ? undefined : cleanAddress(input.address),
  });
  return interpret(data, error, [`/admin/org/${input.organizationId}/configuracoes`]);
}

export async function setLocationStatus(input: {
  organizationId: string;
  locationId: string;
  status: "ACTIVE" | "INACTIVE";
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.locationId !== "string" || !input.locationId) {
    return fail("not_found");
  }
  if (input?.status !== "ACTIVE" && input?.status !== "INACTIVE") {
    return fail("invalid_status");
  }

  const { data, error } = await g.supabase.rpc("admin_set_location_status", {
    p_location_id: input.locationId,
    p_status: input.status,
  });
  return interpret(data, error, [`/admin/org/${input.organizationId}/configuracoes`]);
}

/**
 * Normaliza o endereço vindo do formulário: objeto de strings não vazias, ou
 * `null` quando não há nada. Nunca um array/escalar — a RPC rejeitaria.
 */
function cleanAddress(
  address: Record<string, string> | null | undefined,
): Record<string, string> | null {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return null;
  }
  const entries = Object.entries(address)
    .map(([k, v]) => [k, String(v ?? "").trim()] as const)
    .filter(([, v]) => v !== "");
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}
