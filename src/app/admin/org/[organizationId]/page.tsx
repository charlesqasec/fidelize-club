import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AiAgentCard, type AiAgentOverview } from "@/components/admin/AiAgentCard";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { RatingStars } from "@/components/admin/RatingStars";
import { InlineEmpty, SectionCard } from "@/components/admin/SectionCard";
import { StatCard } from "@/components/admin/StatCard";
import { formatDateTime, formatNumber, isoDaysAgo } from "@/lib/admin/format";
import { requireOrgAccess } from "@/lib/admin/org-access";
import {
  programTypeLabel,
  statusView,
  transactionTypeLabel,
} from "@/lib/admin/status";
import {
  IconCheck,
  IconClock,
  IconGift,
  IconMegaphone,
  IconRepeat,
  IconSparkle,
  IconStar,
  IconUsers,
  type IconComponent,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Visão geral",
  robots: { index: false, follow: false },
};

const ACTIVITY_ICON: Record<string, IconComponent> = {
  VISIT: IconCheck,
  STAMP_ADD: IconStar,
  POINTS_ADD: IconSparkle,
  BONUS: IconSparkle,
  REWARD_REDEEM: IconGift,
  POINTS_REMOVE: IconRepeat,
  ADJUSTMENT: IconRepeat,
  REVERSAL: IconRepeat,
};

function SectionLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-900"
    >
      {children} →
    </Link>
  );
}

/**
 * Visão geral da ORGANIZAÇÃO — dados reais do Supabase, escopo de um único
 * estabelecimento (guarda em `../layout.tsx` + `requireOrgAccess`). Toda
 * query passa pela RLS da sessão do usuário; nada de `service_role`.
 * Métricas nunca são inventadas: sem dados, os cards mostram `0` e a lista
 * mostra um estado vazio coerente.
 *
 * Bloco "Agente de IA" (ETAPA 4.6G, fechamento do MVP): card de insights,
 * hoje só "clientes sem retorno há mais de 30 dias", calculado por
 * `admin_org_ai_agent_overview` (SQL determinístico, sem LLM externa — ver
 * `AiAgentCard`). Escondido quando `noOperation`, porque o estado vazio
 * abaixo já cobre "organização sem histórico ainda". O CTA "Criar campanha"
 * só navega e pré-preenche `/campanhas` (`novaCampanha=1&nome=...`) — nunca
 * cria nem dispara nada sozinho.
 */
export default async function OrganizationHomePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase, access } = await requireOrgAccess(organizationId);

  const since = isoDaysAgo(30);

  const [
    membershipsTotal,
    membershipsActive,
    checkins30d,
    redemptionsTotal,
    campaignsActive,
    feedbackRatings,
    recentActivity,
    programs,
    aiAgentOverview,
  ] = await Promise.all([
    supabase
      .from("customer_memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("customer_memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE"),
    supabase
      .from("loyalty_transactions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("type", "VISIT")
      .gte("created_at", since),
    supabase
      .from("reward_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE"),
    supabase
      .from("customer_feedback")
      .select("rating")
      .eq("organization_id", organizationId),
    supabase
      .from("loyalty_transactions")
      .select("id, type, amount, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("loyalty_programs")
      .select("id, name, type, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase.rpc("admin_org_ai_agent_overview", {
      p_organization_id: organizationId,
    }),
  ]);

  const ratings = feedbackRatings.data ?? [];
  const feedbackCount = ratings.length;
  const feedbackAvg =
    feedbackCount > 0
      ? ratings.reduce((sum, row) => sum + row.rating, 0) / feedbackCount
      : null;

  const activity = recentActivity.data ?? [];
  const programList = programs.data ?? [];
  const base = `/admin/org/${organizationId}`;

  const noOperation =
    activity.length === 0 &&
    programList.length === 0 &&
    (membershipsTotal.count ?? 0) === 0;

  const aiAgentPayload = aiAgentOverview.data as
    | {
        ok?: boolean;
        has_enough_data?: boolean;
        evaluated_count?: number;
        no_return_30d_count?: number;
      }
    | null;
  const aiAgentData: AiAgentOverview | null = aiAgentPayload?.ok
    ? {
        hasEnoughData: Boolean(aiAgentPayload.has_enough_data),
        evaluatedCount: aiAgentPayload.evaluated_count ?? 0,
        noReturnCount: aiAgentPayload.no_return_30d_count ?? 0,
      }
    : null;
  const canCreateCampaign =
    access.viewerRole === "PLATFORM_ADMIN" || access.viewerRole === "OWNER";
  const aiAgentCampaignHref = `${base}/campanhas?novaCampanha=1&nome=${encodeURIComponent(
    "Recuperação de clientes inativos",
  )}`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={access.organizationName}
        title="Visão geral"
        description="Resumo do estabelecimento com dados reais. Um número em zero significa que ainda não há registros — não uma falha."
      />

      {noOperation ? null : (
        <AiAgentCard
          overview={aiAgentData}
          campaignHref={aiAgentCampaignHref}
          canCreateCampaign={canCreateCampaign}
        />
      )}

      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            accent
            label="Clientes"
            value={formatNumber(membershipsTotal.count ?? 0)}
            hint={`${formatNumber(membershipsActive.count ?? 0)} com adesão ativa.`}
            icon={<IconUsers className="h-5 w-5" />}
          />
          <StatCard
            label="Visitas nos últimos 30 dias"
            value={formatNumber(checkins30d.count ?? 0)}
            hint="Check-ins registrados no período."
            icon={<IconClock className="h-5 w-5" />}
          />
          <StatCard
            label="Recompensas resgatadas"
            value={formatNumber(redemptionsTotal.count ?? 0)}
            hint="Total histórico de resgates."
            icon={<IconGift className="h-5 w-5" />}
          />
          <StatCard
            label="Campanhas no ar"
            value={formatNumber(campaignsActive.count ?? 0)}
            hint="Aprovadas e ativas neste momento."
            icon={<IconMegaphone className="h-5 w-5" />}
          />
        </div>
      </section>

      {noOperation ? (
        <EmptyState
          icon={<IconSparkle className="h-6 w-6" />}
          title="Este estabelecimento ainda não começou a operar"
          description="Assim que houver um programa de fidelidade, adesões de clientes e visitas registradas, esta tela passa a resumir tudo automaticamente."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <SectionLink href={`${base}/programa`}>Ver programa</SectionLink>
              <SectionLink href={`${base}/configuracoes`}>
                Ver configurações
              </SectionLink>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard
              title="Atividade recente"
              description="Últimos lançamentos de fidelidade deste estabelecimento."
              icon={<IconClock className="h-5 w-5" />}
              actions={<SectionLink href={`${base}/clientes`}>Clientes</SectionLink>}
              flush={activity.length > 0}
            >
              {activity.length === 0 ? (
                <InlineEmpty icon={<IconClock className="h-4 w-4" />}>
                  Nenhuma movimentação registrada ainda. Visitas, pontos e
                  resgates aparecem aqui assim que houver movimento.
                </InlineEmpty>
              ) : (
                <ul className="divide-y divide-line">
                  {activity.map((item) => {
                    const Icon = ACTIVITY_ICON[item.type] ?? IconRepeat;
                    const positive = item.amount > 0;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-brand-950">
                            {transactionTypeLabel(item.type)}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                        <span
                          className={[
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                            positive
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-surface-soft text-ink-soft",
                          ].join(" ")}
                        >
                          {positive
                            ? `+${formatNumber(item.amount)}`
                            : formatNumber(item.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard
              title="Programa"
              description="Situação do programa de fidelidade."
              icon={<IconRepeat className="h-5 w-5" />}
              actions={<SectionLink href={`${base}/programa`}>Ver</SectionLink>}
            >
              {programList.length === 0 ? (
                <InlineEmpty icon={<IconRepeat className="h-4 w-4" />}>
                  Nenhum programa criado ainda.
                </InlineEmpty>
              ) : (
                <ul className="space-y-3">
                  {programList.map((program) => {
                    const view = statusView.program(program.status);
                    return (
                      <li
                        key={program.id}
                        className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-brand-950">
                              {program.name}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              Mecânica: {programTypeLabel(program.type)}
                            </p>
                          </div>
                          <Badge tone={view.tone} dot={program.status === "ACTIVE"}>
                            {view.label}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Feedback"
              description="Feedback interno recebido dos clientes."
              icon={<IconStar className="h-5 w-5" />}
              actions={<SectionLink href={`${base}/feedback`}>Ver</SectionLink>}
            >
              {feedbackCount === 0 ? (
                <InlineEmpty icon={<IconStar className="h-4 w-4" />}>
                  Nenhum feedback recebido ainda.
                </InlineEmpty>
              ) : (
                <div className="flex items-center gap-4">
                  <p className="font-display text-3xl font-bold tabular-nums text-brand-950">
                    {feedbackAvg?.toFixed(1)}
                    <span className="text-base font-medium text-ink-muted">
                      {" "}
                      / 5
                    </span>
                  </p>
                  <div className="min-w-0">
                    <RatingStars value={feedbackAvg ?? 0} />
                    <p className="mt-1 text-xs text-ink-muted">
                      Média de {formatNumber(feedbackCount)}{" "}
                      {feedbackCount === 1 ? "resposta" : "respostas"}.
                    </p>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
