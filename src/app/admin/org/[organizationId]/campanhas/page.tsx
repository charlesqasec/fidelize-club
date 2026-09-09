import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatCard } from "@/components/admin/StatCard";
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
 * Campanhas reais da organização (RLS: membro da organização ou
 * platform_admin). Somente leitura — nada é aprovado nem ativado aqui. A
 * linha "Aprovação" reflete `approved_at`: o banco impede status
 * APPROVED/ACTIVE sem aprovação registrada (constraint
 * `campaigns_require_approval`).
 */
export default async function CampanhasPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { supabase } = await requireOrgAccess(organizationId);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, name, type, status, start_at, end_at, approved_at, created_at, messages:campaign_messages(channel)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const rows = campaigns ?? [];

  // Derivados das campanhas carregadas — contagens reais, sem projeção.
  const live = rows.filter((row) => row.status === "ACTIVE").length;
  const awaiting = rows.filter(
    (row) => row.status === "PENDING_APPROVAL",
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Comunicação"
        title="Campanhas"
        description="Campanhas padrão e personalizadas deste estabelecimento. Nenhuma vai ao ar sem aprovação — e nada é ativado por esta tela."
        actions={<Badge tone="brand">Somente leitura</Badge>}
      />

      {rows.length === 0 ? (
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
              hint="Aprovadas e ativas agora."
              icon={<IconSparkle className="h-5 w-5" />}
            />
            <StatCard
              label="Aguardando aprovação"
              value={formatNumber(awaiting)}
              hint="Dependem do aceite do proprietário."
              icon={<IconClock className="h-5 w-5" />}
            />
          </div>

          <ul
            aria-label="Lista de campanhas"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {rows.map((row) => {
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
        </>
      )}
    </div>
  );
}
