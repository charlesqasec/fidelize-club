import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { InlineEmpty, SectionCard } from "@/components/admin/SectionCard";
import {
  FeatureFlagsSection,
  type OrgFlags,
} from "@/components/admin/org-settings/FeatureFlagsSection";
import {
  LocationsManager,
  type LocationRow,
} from "@/components/admin/org-settings/LocationsManager";
import { OrganizationSection } from "@/components/admin/org-settings/OrganizationSection";
import {
  TeamManager,
  type MemberRow,
} from "@/components/admin/team-panel/TeamManager";
import { formatAddress, formatDate } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { orgRoleLabel, statusView } from "@/lib/admin/status";
import {
  IconFlag,
  IconMapPin,
  IconStore,
  IconUsers,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Configurações",
  robots: { index: false, follow: false },
};

/**
 * Configurações do PAINEL DO ESTABELECIMENTO. Leitura para todos os
 * papéis; escrita de organização, canais, unidades e equipe SOMENTE para
 * PLATFORM_ADMIN (ETAPA 4.6F, regra do MVP pós-homologação: "Configurações
 * estruturais: estabelecimento consulta; criação/edição/desativação ficam
 * com Fidelize Admin." — revoga o acesso que OWNER tinha em organização/
 * canais/equipe e OWNER+MANAGER tinham em unidades, ETAPAs 4.6B/4.6D).
 * OWNER/MANAGER/STAFF do estabelecimento ficam todos somente leitura
 * aqui — o acesso principal do MVP (OWNER) segue existindo para o resto
 * do painel, só não escreve mais configuração estrutural.
 *
 * A UI só decide o que OFERECE. A autoridade de RBAC é o servidor: as
 * Server Actions revalidam o acesso e as RPCs `admin_*` (SECURITY DEFINER)
 * validam `auth.uid()`, `organization_id` e papel dentro da operação e
 * registram `audit_logs`.
 *
 * Nome/e-mail dos membros vêm de `profiles`, buscado à parte (sem FK
 * PostgREST-embutível de `organization_members` para `profiles` — a FK real
 * é para `auth.users`) e visível graças à policy `profiles_select_org_mates`
 * (20260911150000): quem compartilha uma organização ativa enxerga o perfil
 * de quem também compartilha.
 */
export default async function OrganizationConfiguracoesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const [orgResult, locationsResult, membersResult, flagsResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug, status, created_at")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("locations")
        .select("id, name, slug, status, address")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("organization_members")
        .select("id, role, status, user_id, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("organization_feature_flags")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);

  const organization = orgResult.data;
  const locations = locationsResult.data ?? [];
  const members = membersResult.data ?? [];
  const flags = flagsResult.data;
  const orgStatus = statusView.organization(organization?.status);

  const memberUserIds = members.map((member) => member.user_id);
  const profilesResult =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", memberUserIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  );

  const role = access.viewerRole;
  const canEditOrg = role === "PLATFORM_ADMIN";
  const canEditLocations = role === "PLATFORM_ADMIN";
  const assignableMemberRoles: ("OWNER" | "MANAGER" | "STAFF")[] =
    role === "PLATFORM_ADMIN" ? ["OWNER", "MANAGER", "STAFF"] : [];

  const accessLabel =
    role === "PLATFORM_ADMIN"
      ? "Equipe Fidelize (platform admin)"
      : orgRoleLabel(role);

  const flagState: OrgFlags = {
    web_card_enabled: flags?.web_card_enabled ?? true,
    reviews_enabled: flags?.reviews_enabled ?? false,
    internal_feedback_enabled: flags?.internal_feedback_enabled ?? true,
    web_push_enabled: flags?.web_push_enabled ?? false,
    google_wallet_enabled: flags?.google_wallet_enabled ?? false,
    apple_wallet_enabled: flags?.apple_wallet_enabled ?? false,
  };

  const locationRows: LocationRow[] = locations.map((location) => ({
    id: location.id,
    name: location.name,
    slug: location.slug,
    status: location.status,
    addressLabel: formatAddress(location.address),
  }));

  const memberRows: MemberRow[] = members.map((member) => ({
    id: member.id,
    role: member.role,
    status: member.status,
    createdAtLabel: formatDate(member.created_at),
    name: profileById.get(member.user_id)?.full_name ?? null,
    email: profileById.get(member.user_id)?.email ?? null,
  }));

  // Acesso principal do MVP (ETAPA 4.6F): estabelecimento vê só este acesso
  // — nunca a lista completa de membros/contas técnicas. OWNER ativo tem
  // prioridade; sem ele, cai para qualquer acesso ativo e, por fim, o
  // primeiro cadastrado. `canEditOrg` (PLATFORM_ADMIN) continua vendo a
  // equipe inteira via `TeamManager`, sem mudança nenhuma.
  const primaryAccess =
    memberRows.find((member) => member.role === "OWNER" && member.status === "ACTIVE") ??
    memberRows.find((member) => member.status === "ACTIVE") ??
    memberRows[0] ??
    null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Estabelecimento"
        title="Configurações"
        description="Dados do estabelecimento, unidades, equipe e canais habilitados."
        actions={
          !canEditOrg ? <Badge tone="brand">Somente leitura</Badge> : undefined
        }
      />

      <SectionCard
        title="Estabelecimento"
        description="Identificação e situação na plataforma."
        icon={<IconStore className="h-5 w-5" />}
        actions={
          <Badge
            tone={orgStatus.tone}
            dot={organization?.status === "ACTIVE"}
            size="md"
          >
            {orgStatus.label}
          </Badge>
        }
      >
        <OrganizationSection
          organizationId={organizationId}
          name={organization?.name ?? access.organizationName}
          slug={organization?.slug ?? access.organizationSlug}
          createdAtLabel={formatDate(organization?.created_at)}
          accessLabel={accessLabel}
          canEdit={canEditOrg}
        />
      </SectionCard>

      <SectionCard
        title="Unidades"
        description="Locais físicos deste estabelecimento."
        icon={<IconMapPin className="h-5 w-5" />}
      >
        <LocationsManager
          organizationId={organizationId}
          locations={locationRows}
          canEdit={canEditLocations}
        />
      </SectionCard>

      <SectionCard
        title={canEditOrg ? "Equipe" : "Acesso principal"}
        description={
          canEditOrg
            ? "Pessoas com acesso a este estabelecimento e o papel de cada uma."
            : "MVP: um acesso principal por estabelecimento. Contas técnicas e gestão completa de equipe ficam com a Fidelize.club."
        }
        icon={<IconUsers className="h-5 w-5" />}
      >
        {canEditOrg ? (
          <TeamManager
            organizationId={organizationId}
            members={memberRows}
            canManage={canEditOrg}
            assignableRoles={assignableMemberRoles}
          />
        ) : primaryAccess ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
              >
                {(primaryAccess.name ?? primaryAccess.email ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-brand-950">
                  {primaryAccess.name ?? "Sem nome cadastrado"}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {primaryAccess.email ?? "—"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="brand">{orgRoleLabel(primaryAccess.role)}</Badge>
              <Badge
                tone={statusView.member(primaryAccess.status).tone}
                dot={primaryAccess.status === "ACTIVE"}
              >
                {statusView.member(primaryAccess.status).label}
              </Badge>
            </div>
          </div>
        ) : (
          <InlineEmpty icon={<IconUsers className="h-4 w-4" />}>
            Nenhum acesso vinculado ainda.
          </InlineEmpty>
        )}
      </SectionCard>

      <SectionCard
        title="Canais habilitados"
        description="Preferências deste estabelecimento. Wallet e Web Push só funcionam quando plataforma E estabelecimento estão ativados."
        icon={<IconFlag className="h-5 w-5" />}
      >
        {!flags ? (
          <InlineEmpty icon={<IconFlag className="h-4 w-4" />}>
            Nenhuma configuração de canal encontrada para este estabelecimento.
          </InlineEmpty>
        ) : (
          <FeatureFlagsSection
            organizationId={organizationId}
            flags={flagState}
            canEdit={canEditOrg}
          />
        )}
      </SectionCard>
    </div>
  );
}
