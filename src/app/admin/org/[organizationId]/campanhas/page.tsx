import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import {
  CampaignsManager,
  type CampaignRow,
} from "@/components/admin/campaigns-panel/CampaignsManager";
import { formatDate, formatDateRange, formatNumber } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import {
  campaignTypeLabel,
  channelLabel,
  statusView,
} from "@/lib/admin/status";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconMegaphone,
  IconSparkle,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Campanhas",
  robots: { index: false, follow: false },
};

/**
 * Campanhas da organização — PAINEL DO ESTABELECIMENTO (ETAPA 4.6F, regra
 * do MVP pós-homologação: "estabelecimento deverá criar/editar/ativar/
 * desativar campanhas padrão, com limite de 5 campanhas ativas.
 * Administração avançada, personalizações e alteração de limite ficam com
 * Fidelize Admin."). Campanhas type=STANDARD ganham CRUD completo
 * (`CampaignsManager`, OWNER/PLATFORM_ADMIN); type=ADVANCED (personalizadas,
 * sob orçamento) continuam só leitura aqui — geridas fora deste painel.
 * `activeCount` conta TODAS as campanhas ACTIVE (padrão + personalizadas):
 * é o teto operacional real de campanhas simultâneas, e é exatamente o que
 * a RPC `admin_set_campaign_status` e o trigger `enforce_campaign_active_limit`
 * (20260912151500) checam no backend — a UI só espelha o mesmo número.
 * Nenhum envio real (`campaign_messages`), segmentação avançada nem canal
 * novo é implementado aqui.
 */
export default async function CampanhasPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ novaCampanha?: string; nome?: string }>;
}) {
  const { organizationId } = await params;
  const { novaCampanha, nome } = await searchParams;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const [campaignsResult, programsResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id, name, type, status, start_at, end_at, approved_at, created_at, program_id, messages:campaign_messages(channel)",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_programs")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
  ]);

  const rows = campaignsResult.data ?? [];
  const programs = programsResult.data ?? [];
  const role = access.viewerRole;
  const canEdit = role === "PLATFORM_ADMIN" || role === "OWNER";
  // Prefill vindo do card "Agente de IA" da Visão geral (`?novaCampanha=1&
  // nome=...`) — só abre o formulário de criação se quem chegou aqui pode
  // mesmo criar; nunca envia nem aprova nada sozinho, só preenche o campo.
  const autoOpenCreate = canEdit && novaCampanha === "1";
  const initialCreateName =
    typeof nome === "string" ? nome.replace(/\s+/g, " ").trim().slice(0, 120) : "";

  const standardCampaigns: CampaignRow[] = rows
    .filter((row) => row.type === "STANDARD")
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      start_at: row.start_at,
      end_at: row.end_at,
      approved_at: row.approved_at,
      program_id: row.program_id,
    }));
  const advancedCampaigns = rows.filter((row) => row.type === "ADVANCED");

  // Derivados das campanhas carregadas — contagens reais, sem projeção.
  // Conta TODOS os tipos: é o mesmo teto de 5 ACTIVE que o backend garante.
  const live = rows.filter((row) => row.status === "ACTIVE").length;
  const awaiting = rows.filter(
    (row) => row.status === "PENDING_APPROVAL",
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Comunicação"
        title="Campanhas"
        description="Campanhas padrão e personalizadas deste estabelecimento. Nenhuma vai ao ar sem aprovação."
        actions={
          !canEdit ? <Badge tone="brand">Somente leitura</Badge> : undefined
        }
      />

      {rows.length === 0 && !canEdit ? (
        <EmptyState
          icon={<IconMegaphone className="h-6 w-6" />}
          title="Nenhuma campanha ainda"
          description="As campanhas deste estabelecimento aparecem aqui assim que forem criadas — e só ficam no ar depois de aprovadas pelo proprietário."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              accent
              label="Campanhas"
              value={formatNumber(rows.length)}
              hint="Total cadastrado neste estabelecimento."
              icon={<IconMegaphone className="h-5 w-5" />}
            />
            <StatCard
              label="No ar"
              value={formatNumber(live)}
              hint="De 5 ativas permitidas ao mesmo tempo."
              icon={<IconSparkle className="h-5 w-5" />}
            />
            <StatCard
              label="Aguardando aprovação"
              value={formatNumber(awaiting)}
              hint="Campanhas personalizadas da equipe Fidelize."
              icon={<IconClock className="h-5 w-5" />}
            />
          </div>

          <SectionCard
            title="Campanhas padrão"
            description="Ponto em dobro, retorno, aniversário, indicação, promoção da semana — inclusas na operação do programa."
            icon={<IconMegaphone className="h-5 w-5" />}
          >
            <CampaignsManager
              organizationId={organizationId}
              campaigns={standardCampaigns}
              programs={programs}
              activeCount={live}
              canEdit={canEdit}
              autoOpenCreate={autoOpenCreate}
              initialCreateName={initialCreateName}
            />
          </SectionCard>

          {advancedCampaigns.length === 0 ? null : (
          <SectionCard
            title="Campanhas personalizadas"
            description="Sob orçamento — configuradas e aprovadas pela equipe Fidelize."
            icon={<IconSparkle className="h-5 w-5" />}
          >
          <ul
            aria-label="Lista de campanhas personalizadas"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {advancedCampaigns.map((row) => {
              const view = statusView.campaign(row.status);
              const channels = Array.from(
                new Set((row.messages ?? []).map((message) => message.channel)),
              );
              const isLive = row.status === "ACTIVE";
              return (
                <li
                  key={row.id}
                  className={[
                    "admin-card flex flex-col rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md hover:shadow-brand-900/5",
                    isLive ? "border-brand-200" : "border-line",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isLive
                          ? "bg-brand-600 text-white"
                          : "bg-brand-50 text-brand-600",
                      ].join(" ")}
                    >
                      <IconMegaphone className="h-5 w-5" />
                    </span>
                    <Badge tone={view.tone} dot={isLive}>
                      {view.label}
                    </Badge>
                  </div>

                  <h2 className="mt-4 font-display text-base font-semibold leading-snug text-brand-950">
                    {row.name}
                  </h2>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Campanha {campaignTypeLabel(row.type).toLowerCase()}
                  </p>

                  <dl className="mt-4 space-y-2.5 text-sm">
                    <div className="flex items-start gap-2.5">
                      <IconClock
                        className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <dt className="sr-only">Período</dt>
                        <dd className="text-ink-soft">
                          {formatDateRange(row.start_at, row.end_at)}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      {row.approved_at ? (
                        <IconCheck
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <IconAlert
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <dt className="sr-only">Aprovação</dt>
                        <dd
                          className={
                            row.approved_at ? "text-ink-soft" : "text-amber-800"
                          }
                        >
                          {row.approved_at
                            ? `Aprovada em ${formatDate(row.approved_at)}`
                            : "Ainda não aprovada"}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-auto pt-4">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
                      Canais
                    </p>
                    {channels.length === 0 ? (
                      <p className="mt-1.5 text-sm text-ink-muted">
                        Nenhuma mensagem configurada.
                      </p>
                    ) : (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {channels.map((channel) => (
                          <li key={channel}>
                            <Badge tone="neutral">{channelLabel(channel)}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
