import { revalidatePath } from "next/cache";

import { getAdminContext, resolveOrganizationAccess } from "@/lib/admin/context";
import { createClient } from "@/lib/supabase/server";

/**
 * Infraestrutura comum das Server Actions de escrita do painel do
 * estabelecimento (ETAPA 4.6B / 4.6C em diante). Extraído de
 * `org-settings/actions.ts` para ser reaproveitado por qualquer bloco novo
 * que siga o mesmo padrão: guarda de sessão/organização + delegação da
 * escrita para uma RPC `admin_*` SECURITY DEFINER (autoridade final de
 * RBAC) + interpretação uniforme do retorno `{ ok, reason }`.
 */

export type AdminActionResult =
  | { ok: true; clamped?: string[] }
  | { ok: false; error: string };

/** Mensagens neutras em pt-BR para as `reason` conhecidas das RPCs `admin_*`. */
const REASON_MESSAGE: Record<string, string> = {
  forbidden: "Você não tem permissão para esta ação.",
  not_found: "Registro não encontrado.",
  invalid_name: "Confira o nome informado (mínimo 2 caracteres).",
  invalid_slug:
    "O identificador deve ter só letras minúsculas, números e hífens (2 a 60 caracteres).",
  invalid_address: "Endereço em formato inválido.",
  invalid_status: "Status inválido.",
  invalid_rules: "Uma das configurações da mecânica é inválida.",
  invalid_logo_url: "O link do logo deve começar com http:// ou https://.",
  invalid_color: "Uma das cores informadas é inválida (use o formato #RRGGBB).",
  invalid_card_style: "Estilo de cartão inválido.",
  invalid_headline: "A headline deve ter no máximo 120 caracteres.",
  invalid_description: "A descrição deve ter no máximo 500 caracteres.",
  invalid_reward_type: "Tipo de recompensa inválido.",
  invalid_threshold: "Meta da recompensa inválida.",
  slug_taken: "Já existe uma unidade com esse identificador.",
  no_changes: "Nenhuma alteração para salvar.",
  network:
    "Não foi possível concluir agora. Verifique a conexão e tente novamente.",
};

export function fail(reason: string): { ok: false; error: string } {
  return { ok: false, error: REASON_MESSAGE[reason] ?? REASON_MESSAGE.network };
}

export type RpcPayload = { ok?: boolean; reason?: string } & Record<string, unknown>;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type Guarded =
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseServerClient };

/**
 * Guarda comum: sessão + acesso à organização. Retorna o client Supabase
 * (sessão do usuário, sujeito a RLS) ou uma falha já formatada. A RPC
 * `admin_*` ainda revalida tudo server-side — esta checagem é a primeira
 * camada, não a única.
 */
export async function guard(organizationId: string): Promise<Guarded> {
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    return fail("not_found");
  }
  const supabase = await createClient();
  const context = await getAdminContext(supabase);
  if (!context) return fail("forbidden");
  const access = await resolveOrganizationAccess(
    supabase,
    context,
    organizationId,
  );
  if (!access) return fail("forbidden");
  return { ok: true, supabase };
}

/**
 * Interpreta o retorno padrão `{ ok, reason }` de uma RPC `admin_*` e
 * revalida `revalidatePaths` em caso de sucesso. O retorno é sempre estreito
 * (`AdminActionResult`) — nunca a linha crua do banco.
 */
export function interpret(
  data: unknown,
  error: unknown,
  revalidatePaths: string[],
): AdminActionResult {
  if (error) return fail("network");
  const payload = (data ?? null) as RpcPayload | null;
  if (payload?.ok === true) {
    for (const path of revalidatePaths) revalidatePath(path);
    const clamped = Array.isArray(payload.clamped)
      ? payload.clamped.filter((v): v is string => typeof v === "string")
      : undefined;
    return clamped && clamped.length > 0 ? { ok: true, clamped } : { ok: true };
  }
  return fail(typeof payload?.reason === "string" ? payload.reason : "network");
}
