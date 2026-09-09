import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type OrganizationRole = "OWNER" | "MANAGER" | "STAFF";

export type OrganizationMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
};

export type AdminContext = {
  userId: string;
  email: string | undefined;
  /** Equipe Fidelize (`public.platform_admins`, status ACTIVE). */
  isPlatformAdmin: boolean;
  /** Vínculos ativos em `public.organization_members` — pode ter mais de um. */
  memberships: OrganizationMembership[];
};

/**
 * Resolve quem é o usuário autenticado e a quê ele tem direito, nos dois
 * sentidos que a ETAPA 3.2.1 define (docs/ARQUITETURA.md, seção 10):
 * equipe Fidelize (`platform_admins`) e equipe do estabelecimento
 * (`organization_members`). Camada única reutilizada por todo layout/
 * server action do Fidelize Admin — nunca reimplementar essa checagem
 * localmente em cada rota.
 *
 * `is_platform_admin()` via `rpc` (não SELECT direto — `platform_admins`
 * não tem policy nenhuma para `authenticated`, de propósito). Já
 * `organization_members` TEM policy própria (`user_id = auth.uid()`), então
 * memberships vêm de um SELECT normal, sujeito a RLS como qualquer query
 * do app — nunca `service_role`.
 *
 * Retorna `null` só quando não há sessão nenhuma (chamador decide
 * redirecionar para `/login`). Estar autenticado mas não ser
 * `platform_admin` nem ter nenhuma membership ativa é uma combinação
 * válida de retorno (`isPlatformAdmin: false`, `memberships: []`) — quem
 * chama decide o que fazer (hoje: negar acesso ao Admin).
 */
export async function getAdminContext(
  supabase: SupabaseServerClient,
): Promise<AdminContext | null> {
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return null;

  const [{ data: isPlatformAdmin }, { data: membershipRows }] =
    await Promise.all([
      supabase.rpc("is_platform_admin"),
      supabase
        .from("organization_members")
        .select("organization_id, role, organizations ( name, slug )")
        .eq("user_id", claimsData.claims.sub)
        .eq("status", "ACTIVE"),
    ]);

  const memberships: OrganizationMembership[] = (membershipRows ?? []).flatMap(
    (row) => {
      if (!row.organizations) return [];
      return [
        {
          organizationId: row.organization_id,
          organizationName: row.organizations.name,
          organizationSlug: row.organizations.slug,
          role: row.role as OrganizationRole,
        },
      ];
    },
  );

  return {
    userId: claimsData.claims.sub,
    email: claimsData.claims.email,
    isPlatformAdmin: Boolean(isPlatformAdmin),
    memberships,
  };
}

export type OrganizationAccess = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  /** Por que este usuário pode ver esta organização. */
  viewerRole: "PLATFORM_ADMIN" | OrganizationRole;
};

/**
 * Decide se `context` pode entrar no CONTEXTO ADMINISTRATIVO da organização
 * `organizationId` — nunca troca a sessão Auth, nunca usa credencial do
 * estabelecimento (docs/ARQUITETURA.md, seção 10, "acesso administrativo
 * sem impersonação"). `platform_admin` pode administrar qualquer
 * organização com a própria sessão; um membro de estabelecimento só pode
 * entrar nas organizações onde tem membership ativa — nunca noutra,
 * mesmo sabendo o id (retorna `null`, e quem chama deve responder 404,
 * nunca vazar se a organização existe).
 */
export async function resolveOrganizationAccess(
  supabase: SupabaseServerClient,
  context: AdminContext,
  organizationId: string,
): Promise<OrganizationAccess | null> {
  if (context.isPlatformAdmin) {
    const { data: organization } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", organizationId)
      .maybeSingle();

    if (!organization) return null;

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      viewerRole: "PLATFORM_ADMIN",
    };
  }

  const membership = context.memberships.find(
    (item) => item.organizationId === organizationId,
  );
  if (!membership) return null;

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    organizationSlug: membership.organizationSlug,
    viewerRole: membership.role,
  };
}
