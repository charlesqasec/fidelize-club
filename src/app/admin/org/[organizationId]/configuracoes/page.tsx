import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { DataTable } from "@/components/admin/DataTable";
import {
  DefinitionList,
  InlineEmpty,
  SectionCard,
} from "@/components/admin/SectionCard";
import { formatAddress, formatDate, shortId } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import { orgRoleLabel, statusView } from "@/lib/admin/status";
import {
  IconCheck,
  IconFlag,
  IconMapPin,
  IconStore,
  IconUsers,
  IconX,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Configurações",
  robots: { index: false, follow: false },
};

/**
 * Tile somente leitura de um flag de canal. Não é um switch de propósito:
 * nesta etapa não existe edição, e um controle interativo prometeria uma
 * ação que ainda não existe.
 */
function FlagTile({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <li
      className={[
        "flex items-start gap-3 rounded-xl border p-4",
        enabled ? "border-emerald-200 bg-emerald-50/40" : "border-line bg-surface-soft/60",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          enabled
            ? "bg-emerald-600 text-white"
            : "bg-white text-ink-muted ring-1 ring-inset ring-line",
        ].join(" ")}
      >
        {enabled ? <IconCheck className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-950">{label}</p>
          <Badge tone={enabled ? "positive" : "neutral"}>
            {enabled ? "Ativado" : "Desativado"}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
      </div>
    </li>
  );
}

/**
 * Configurações da organização — somente leitura nesta etapa (sem CRUD).
 * Mostra organização, unidades, membros e flags de canal
 * (`organization_feature_flags` — não confundir com `platform_settings`, o
 * kill-switch global; o efetivo de cada canal é os dois juntos).
 *
 * Membros: `organization_members` é legível para membros da mesma
 * organização, mas `profiles` (nome/e-mail) só para o próprio usuário e
 * platform_admin — por isso a lista mostra papel/status, não e-mail.
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Estabelecimento"
        title="Configurações"
        description="Dados do estabelecimento, unidades, equipe e canais habilitados."
        actions={<Badge tone="brand">Somente leitura</Badge>}
      />

      <SectionCard
        title="Estabelecimento"
        description="Identificação e situação na plataforma."
        icon={<IconStore className="h-5 w-5" />}
        actions={
          <Badge tone={orgStatus.tone} dot={organization?.status === "ACTIVE"} size="md">
            {orgStatus.label}
          </Badge>
        }
      >
        <DefinitionList
          columns={3}
          items={[
            { term: "Nome", value: organization?.name ?? access.organizationName },
            {
              term: "Slug",
              value: (
                <code className="rounded-md bg-surface-soft px-1.5 py-0.5 font-mono text-xs ring-1 ring-inset ring-line">
                  {organization?.slug ?? access.organizationSlug}
                </code>
              ),
            },
            {
              term: "Na plataforma desde",
              value: formatDate(organization?.created_at),
            },
            {
              term: "Seu acesso",
              value:
                access.viewerRole === "PLATFORM_ADMIN"
                  ? "Equipe Fidelize (platform admin)"
                  : orgRoleLabel(access.viewerRole),
            },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Unidades"
        description="Locais físicos deste estabelecimento."
        icon={<IconMapPin className="h-5 w-5" />}
        flush={locations.length > 0}
      >
        {locations.length === 0 ? (
          <InlineEmpty icon={<IconMapPin className="h-4 w-4" />}>
            Nenhuma unidade cadastrada ainda.
          </InlineEmpty>
        ) : (
          <DataTable
            caption="Unidades do estabelecimento"
            rows={locations}
            rowKey={(location) => location.id}
            minWidth={600}
            columns={[
              {
                id: "name",
                header: "Unidade",
                mobile: "title",
                cell: (location) => (
                  <div className="min-w-0">
                    <p className="font-medium text-brand-950">{location.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-muted">
                      {location.slug}
                    </p>
                  </div>
                ),
              },
              {
                id: "address",
                header: "Endereço",
                className: "text-ink-soft",
                cell: (location) => formatAddress(location.address),
              },
              {
                id: "status",
                header: "Status",
                mobile: "badge",
                cell: (location) => {
                  const view = statusView.location(location.status);
                  return (
                    <Badge tone={view.tone} dot={location.status === "ACTIVE"}>
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
        title="Equipe"
        description="Pessoas com acesso a este estabelecimento e o papel de cada uma."
        icon={<IconUsers className="h-5 w-5" />}
        flush={members.length > 0}
        footer={
          members.length > 0
            ? "Nome e e-mail dos membros não são exibidos nesta etapa — apenas papel e situação."
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
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Canais">
            <FlagTile
              label="Cartão web"
              description="Cartão Digital no navegador — o canal base, sempre disponível."
              enabled={flags.web_card_enabled}
            />
            <FlagTile
              label="Google Wallet"
              description="Cartão salvo na carteira do Android."
              enabled={flags.google_wallet_enabled}
            />
            <FlagTile
              label="Apple Wallet"
              description="Cartão salvo na carteira do iPhone."
              enabled={flags.apple_wallet_enabled}
            />
            <FlagTile
              label="Web Push"
              description="Notificações de campanha no navegador."
              enabled={flags.web_push_enabled}
            />
            <FlagTile
              label="Avaliação pública"
              description="Convite neutro para avaliar nos canais externos."
              enabled={flags.reviews_enabled}
            />
            <FlagTile
              label="Feedback interno"
              description="Formulário privado de feedback após a visita."
              enabled={flags.internal_feedback_enabled}
            />
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
