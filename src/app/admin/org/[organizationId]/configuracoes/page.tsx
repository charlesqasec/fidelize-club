import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
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
import { formatAddress, formatDate, shortId } from "@/lib/admin/format";
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
 * Configurações do PAINEL DO ESTABELECIMENTO (ETAPA 4.6B / bloco 1).
 * Leitura como antes; escrita de organização, canais e unidades conforme o
 * papel do usuário:
 *
 *   PLATFORM_ADMIN / OWNER -> organização, canais e unidades
 *   MANAGER                -> apenas unidades
 *   STAFF                  -> somente leitura
 *
 * A UI só decide o que OFERECE. A autoridade de RBAC é o servidor: as
 * Server Actions revalidam o acesso e as RPCs `admin_*` (SECURITY DEFINER)
 * validam `auth.uid()`, `organization_id` e papel dentro da operação e
 * registram `audit_logs`.
 *
 * Equipe (`organization_members`) segue somente leitura — gestão de equipe
 * está fora deste bloco.
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

  const role = access.viewerRole;
  const canEditOrg = role === "PLATFORM_ADMIN" || role === "OWNER";
  const canEditLocations =
    role === "PLATFORM_ADMIN" || role === "OWNER" || role === "MANAGER";

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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Estabelecimento"
        title="Configurações"
        description="Dados do estabelecimento, unidades, equipe e canais habilitados."
        actions={
          role === "STAFF" ? (
            <Badge tone="brand">Somente leitura</Badge>
          ) : undefined
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
        title="Equipe"
        description="Pessoas com acesso a este estabelecimento e o papel de cada uma."
        icon={<IconUsers className="h-5 w-5" />}
        flush={members.length > 0}
        footer={
          members.length > 0
            ? "Nome e e-mail dos membros não são exibidos nesta etapa — apenas papel e situação. Gestão de equipe é um próximo bloco."
            : undefined
        }
      >
        {members.length === 0 ? (
          <InlineEmpty icon={<IconUsers className="h-4 w-4" />}>
            Nenhum membro vinculado ainda.
          </InlineEmpty>
        ) : (
          <DataTable
            caption="Membros da equipe do estabelecimento"
            rows={members}
            rowKey={(member) => member.id}
            minWidth={560}
            columns={[
              {
                id: "user",
                header: "Usuário",
                mobile: "title",
                cell: (member) => (
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
                    >
                      {orgRoleLabel(member.role).charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-brand-950">
                        {orgRoleLabel(member.role)}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink-muted">
                        {shortId(member.user_id)}…
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                id: "role",
                header: "Papel",
                mobile: "hidden",
                cell: (member) => orgRoleLabel(member.role),
              },
              {
                id: "since",
                header: "Desde",
                className: "whitespace-nowrap text-ink-soft",
                cell: (member) => formatDate(member.created_at),
              },
              {
                id: "status",
                header: "Status",
                mobile: "badge",
                cell: (member) => {
                  const view = statusView.member(member.status);
                  return (
                    <Badge tone={view.tone} dot={member.status === "ACTIVE"}>
                      {view.label}
                    </Badge>
                  );
                },
              },
            ]}
          />
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
