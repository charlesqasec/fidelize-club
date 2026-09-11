import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase ADMIN — usa `service_role`, ignora RLS por completo.
 *
 * Uso EXCLUSIVO server-side, e só dentro de Server Actions que já validaram
 * sessão + acesso à organização (`guard()`) antes de chamar isto — a
 * autoridade de RBAC continua sendo a RPC `admin_*` (SECURITY DEFINER)
 * chamada em seguida com a sessão normal do usuário, nunca este client.
 * NUNCA importar este módulo de um "use client" nem de qualquer código que
 * possa rodar no navegador — a chave `service_role` nunca pode chegar lá.
 *
 * Hoje o único consumidor é `src/lib/admin/team-panel/actions.ts` (ETAPA
 * 4.6D): convidar um novo membro via Auth Admin API e localizar, por
 * e-mail, um usuário Fidelize já existente em `public.profiles` — leitura
 * que a sessão normal não pode fazer (RLS de `profiles` é self-only, mais
 * colegas de organização; não cobre buscar por e-mail alheio antes de saber
 * quem é o dono).
 *
 * Falha explícita (throw) se a env var não estiver configurada — nunca cai
 * silenciosamente para outra chave.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias (env só de servidor).",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
