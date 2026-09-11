"use server";

import { type AdminActionResult, fail, guard, interpret } from "@/lib/admin/rpc";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * Server Actions de escrita da EQUIPE do painel do estabelecimento
 * (`organization_members`). ETAPA 4.6D.
 *
 * `guard()` resolve sessão + acesso à organização (primeira camada); a
 * escrita em si é sempre delegada a uma RPC `admin_*` SECURITY DEFINER
 * (`20260911150000_team_management_admin_rpcs.sql`) — autoridade final de
 * RBAC, proteção do último OWNER e `audit_logs`. Nenhuma tabela base recebe
 * policy de escrita.
 *
 * `addMember` é a única ação aqui que sai do banco: precisa da Auth Admin
 * API (`service_role`, `src/lib/supabase/adminClient.ts`) para localizar um
 * usuário Fidelize já existente (por e-mail, em `public.profiles` — não
 * existe `auth.admin.getUserByEmail` na versão instalada de
 * `@supabase/supabase-js`, só `listUsers` paginado sem filtro por e-mail) ou
 * criar a conta via `inviteUserByEmail` quando não existe. Em nenhum dos
 * dois casos este código vê ou grava senha — quem define a senha é a pessoa
 * convidada, na página `/definir-senha`, com a sessão temporária do link.
 */

const TEAM_PATH = (organizationId: string) =>
  `/admin/org/${organizationId}/configuracoes`;

const ASSIGNABLE_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

export async function addMember(input: {
  organizationId: string;
  email: string;
  role: AssignableRole;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;

  if (!isAssignableRole(input?.role)) {
    return fail("invalid_role");
  }

  const email = String(input?.email ?? "")
    .trim()
    .toLowerCase();
  if (email.length === 0 || email.length > 320 || !EMAIL_RE.test(email)) {
    return fail("invalid_email");
  }

  const admin = createAdminClient();

  // Usuário Fidelize já existente? `profiles.email` espelha `auth.users.email`
  // (trigger `handle_new_user`); só o client `service_role` pode ler o
  // e-mail de outra pessoa aqui (RLS de `profiles` é self-only + colegas de
  // organização — não cobre "ainda não sei quem é essa pessoa").
  const { data: existingProfile, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) return fail("network");

  let userId: string;
  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/definir-senha`,
      });
    if (inviteError || !invited?.user) {
      return fail("invite_failed");
    }
    userId = invited.user.id;
  }

  const { data, error } = await g.supabase.rpc("admin_add_member", {
    p_organization_id: input.organizationId,
    p_user_id: userId,
    p_role: input.role,
  });
  return interpret(data, error, [TEAM_PATH(input.organizationId)]);
}

export async function updateMemberRole(input: {
  organizationId: string;
  memberId: string;
  role: AssignableRole;
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.memberId !== "string" || !input.memberId) {
    return fail("not_found");
  }
  if (!isAssignableRole(input?.role)) {
    return fail("invalid_role");
  }

  const { data, error } = await g.supabase.rpc("admin_update_member_role", {
    p_organization_id: input.organizationId,
    p_member_id: input.memberId,
    p_role: input.role,
  });
  return interpret(data, error, [TEAM_PATH(input.organizationId)]);
}

export async function setMemberStatus(input: {
  organizationId: string;
  memberId: string;
  status: "ACTIVE" | "SUSPENDED";
}): Promise<AdminActionResult> {
  const g = await guard(input?.organizationId);
  if (!g.ok) return g;
  if (typeof input?.memberId !== "string" || !input.memberId) {
    return fail("not_found");
  }
  if (input?.status !== "ACTIVE" && input?.status !== "SUSPENDED") {
    return fail("invalid_status");
  }

  const { data, error } = await g.supabase.rpc("admin_set_member_status", {
    p_organization_id: input.organizationId,
    p_member_id: input.memberId,
    p_status: input.status,
  });
  return interpret(data, error, [TEAM_PATH(input.organizationId)]);
}
