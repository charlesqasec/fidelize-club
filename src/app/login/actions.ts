"use server";

import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/context";
import { createClient } from "@/lib/supabase/server";

/**
 * Login do Fidelize Admin. Dois públicos possíveis desde a ETAPA 3.2.1
 * (docs/ARQUITETURA.md, seção 10): equipe Fidelize (`platform_admins`) e
 * equipe de estabelecimento (`organization_members`, OWNER/MANAGER/STAFF).
 * Só e-mail/senha via Supabase Auth; nenhum cadastro é feito aqui — contas
 * são criadas manualmente por enquanto (ETAPA 2, `docs/BANCO_DE_DADOS.md`,
 * seção 5).
 *
 * A resolução de quem é o usuário (`getAdminContext`) nunca faz SELECT
 * direto em `platform_admins` (sem policy para `authenticated`, de
 * propósito) — usa a função `is_platform_admin()` via `rpc`. Nunca
 * `service_role` no frontend.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=credenciais_invalidas");
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    redirect("/login?error=credenciais_invalidas");
  }

  const context = await getAdminContext(supabase);

  if (context?.isPlatformAdmin) {
    redirect("/admin");
  }

  if (context && context.memberships.length > 0) {
    redirect(`/admin/org/${context.memberships[0].organizationId}`);
  }

  // Autenticado com sucesso, mas sem vínculo ativo em platform_admins nem
  // em organization_members: acesso ao Fidelize Admin é negado — a sessão
  // não fica "meio aberta".
  await supabase.auth.signOut();
  redirect("/login?error=acesso_negado");
}
